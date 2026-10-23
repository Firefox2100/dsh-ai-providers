import {describe, expect, it} from 'vitest'
import type {GenerateOptions, StreamChunk} from '@deepseek-ai/dsh-llm'
import type {LlmCall} from '@dsh-ai-providers/core'
import {wireBody, wireConversation} from '../src/llm/serialize.ts'
import {translate} from '../src/llm/translate.ts'
import {AnthropicLlmService} from '../src/llm/service.ts'
import {Config} from '../src/config.ts'

const options = (): GenerateOptions => ({provider:'claude',model:'claude-test',messages:[
  {role:'system',content:[{type:'text',text:'Be brief.'}],source:{kind:'system-prompt'},id:'s' as never},
  {role:'user',content:[{type:'text',text:'Look'}],source:{kind:'user'},id:'u' as never},
  {role:'assistant',content:[{type:'text',text:'Checking.'},{type:'tool-call',id:'call-1' as never,name:'inspect',arguments:'{"place":"door"}'}],source:{kind:'model',provider:'claude',model:'claude-test'},id:'a' as never},
  {role:'tool',content:[{type:'text',text:'Locked'}],source:{kind:'tool',callId:'call-1' as never},toolCallId:'call-1' as never,id:'t' as never},
],tools:[{name:'inspect',description:'Inspect',parameters:{type:'object'}}]})
const call = (): LlmCall => ({options:options(),route:{id:'claude',name:'Claude',models:[]},model:{id:'claude-test',name:'Claude',maxTokens:500},sampling:{toolChoice:'required',temperature:.2},headers:{'user-agent':'dsh'}})
async function* events(...values:unknown[]){for(const value of values)yield JSON.stringify(value)}
async function collect(source:AsyncIterable<StreamChunk>){const out:StreamChunk[]=[];for await(const value of source)out.push(value);return out}

describe('Anthropic request mapping',()=>{
  it('maps system, tools, calls and results to native Messages blocks',async()=>{
    const conversation=await wireConversation(options())
    expect(conversation.system).toBe('Be brief.')
    expect(conversation.messages[1]).toMatchObject({role:'assistant',content:[{type:'text'},{type:'tool_use',id:'call-1',input:{place:'door'}}]})
    expect(conversation.messages[2]).toMatchObject({role:'user',content:[{type:'tool_result',tool_use_id:'call-1',content:'Locked'}]})
    expect(await wireBody(call())).toMatchObject({model:'claude-test',stream:true,max_tokens:500,temperature:.2,tool_choice:{type:'any'},tools:[{name:'inspect',input_schema:{type:'object'}}]})
  })
})

describe('Anthropic stream mapping',()=>{
  it('maps thinking, text, tool input, usage and finish',async()=>{
    const chunks=await collect(translate(events(
      {type:'message_start',message:{usage:{input_tokens:12,cache_read_input_tokens:3}}},
      {type:'content_block_start',index:0,content_block:{type:'thinking',thinking:''}},
      {type:'content_block_delta',index:0,delta:{type:'thinking_delta',thinking:'plan'}},
      {type:'content_block_stop',index:0},
      {type:'content_block_start',index:1,content_block:{type:'tool_use',id:'tool-1',name:'inspect',input:{}}},
      {type:'content_block_delta',index:1,delta:{type:'input_json_delta',partial_json:'{"place":"door"}'}},
      {type:'content_block_stop',index:1},
      {type:'message_delta',delta:{stop_reason:'tool_use'},usage:{output_tokens:8}},
      {type:'message_stop'},
    )))
    expect(chunks).toContainEqual({type:'reasoning-delta',index:0,text:'plan'})
    expect(chunks).toContainEqual({type:'block-end',index:1,block:{type:'tool-call',id:'tool-1',name:'inspect',arguments:'{"place":"door"}'}})
    expect(chunks).toContainEqual({type:'usage',usage:{inputTokens:12,outputTokens:8,cacheReadTokens:3}})
    expect(chunks.at(-1)).toEqual({type:'finish',reason:{kind:'tool-calls'}})
  })
})

describe('Anthropic service',()=>{
  it('uses native headers and endpoint and discovers models',async()=>{
    const seen:{url:string;init:RequestInit}[]=[]
    const frames=[{type:'content_block_start',index:0,content_block:{type:'text',text:''}},{type:'content_block_delta',index:0,delta:{type:'text_delta',text:'Hi'}},{type:'content_block_stop',index:0},{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:1}},{type:'message_stop'}]
    const service=new AnthropicLlmService({config:{connections:{get:()=>[{id:'c',name:'C',baseUrl:'https://api.anthropic.com/v1/',apiKeyRef:'KEY'}]},llmRoutes:{get:()=>[{id:'claude',name:'Claude',connection:'c',models:[{id:'claude-test',name:'Claude'}]}]},anthropicVersion:{get:()=> '2023-06-01'},llmIdleTimeoutMs:{get:()=>5000}} as never,credentials:()=>({resolve:()=>Promise.resolve({value:'secret',source:'file'})}) as never,fetch:(async(url:string,init:RequestInit={})=>{seen.push({url,init});if(url.includes('/models'))return Response.json({data:[{id:'claude-a',display_name:'Claude A'}]});return new Response(frames.map(x=>`data: ${JSON.stringify(x)}\n\n`).join(''))}) as never})
    expect((await collect(service.stream(call()))).at(-1)).toEqual({type:'finish',reason:{kind:'stop'}})
    expect(seen[0]?.url).toBe('https://api.anthropic.com/v1/messages')
    expect(seen[0]?.init.headers).toMatchObject({'x-api-key':'secret','anthropic-version':'2023-06-01'})
    expect(await service.discover('claude')).toEqual([{id:'claude-a',name:'Claude A',inputs:['text','image']}])
    expect(await service.interrogate({baseUrl:'https://draft.test/v1',apiKey:'draft-key'})).toEqual([{id:'claude-a',name:'Claude A',inputs:['text','image']}])
    expect(seen.at(-1)?.url).toBe('https://draft.test/v1/models?limit=100')
    expect(seen.at(-1)?.init.headers).toEqual({'x-api-key':'draft-key','anthropic-version':'2023-06-01'})
    expect(await service.interrogate({baseUrl:'https://draft.test/without-key'})).toEqual([{id:'claude-a',name:'Claude A',inputs:['text','image']}])
    expect(seen.at(-1)?.init.headers).toEqual({'anthropic-version':'2023-06-01'})
    expect(service.routes()[0]).toMatchObject({id:'claude',baseUrl:'https://api.anthropic.com/v1'})
  })
})

describe('Anthropic route configuration',()=>{
  it('accepts a route that sets no retry policy, and one that sets some',()=>{
    const [bare,retried]=Config({llmRoutes:[{id:'a',name:'A',connection:'c'},{id:'b',name:'B',connection:'c',retry:{mode:'always'}}]}).llmRoutes.get()
    expect(bare!.models).toEqual([])
    expect(bare!.retry).toBeUndefined()
    expect(retried!.retry).toMatchObject({mode:'always'})
  })
})
