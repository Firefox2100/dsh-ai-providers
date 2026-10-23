import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './index.module.css';

const capabilities = [
  ['llm', 'Language models', 'Multiple provider routes coexist through DSH’s model interface.'],
  ['embed', 'Embeddings', 'Selected provider exposed as ctx.embeddings.'],
  ['rerank', 'Reranking', 'Selected provider exposed as ctx.rerankers.'],
  ['tts', 'Text-to-speech', 'Streaming audio through ctx.textToSpeech.'],
  ['stt', 'Speech-to-text', 'File and optional live transcription services.'],
  ['image', 'Image generation', 'Generated blobs and optional reference images.'],
] as const;

function capabilityText(key: string, field: 'name' | 'description', message: string): string {
  return translate({id: `homepage.capability.${key}.${field}`, message});
}

const providers = [
  ['OpenAI-compatible', 'LLM · embed · TTS · STT · image'],
  ['LocalAI', 'LLM · embed · rerank · TTS · STT · image'],
  ['Anthropic', 'LLM'],
  ['Ollama', 'LLM · embed'],
  ['Cohere', 'LLM · embed · rerank'],
  ['Jina', 'rerank · embed'],
] as const;

function Arrow(): ReactNode {
  return <svg aria-hidden="true" viewBox="0 0 18 18"><path d="M3 9h11M10 5l4 4-4 4"/></svg>;
}

function Backplane(): ReactNode {
  return (
    <div className={styles.backplane} aria-label={translate({id: 'homepage.backplane.aria', message: 'Consumer plugin connected through the stable contract to capabilities and providers'})}>
      <div className={styles.diagramHeader}>
        <span><Translate id="homepage.backplane.trace">Illustrative integration path</Translate></span>
        <span className={styles.status}><i /> <Translate id="homepage.backplane.status">contract available</Translate></span>
      </div>
      <div className={styles.consumerNode}>
        <span><Translate id="homepage.backplane.consumer">Consumer plugin</Translate></span>
        <code>await ctx.embeddings.embed(texts)</code>
      </div>
      <div className={styles.providerRail}>
        <span>OpenAI</span><span>LocalAI</span><span>Anthropic</span><span>Ollama</span><span>Cohere</span><span>Jina</span>
      </div>
      <div className={styles.bus}><span>@dsh-ai-providers/core</span><b><Translate id="homepage.backplane.contract">Stable consumer contract</Translate></b></div>
      <div className={styles.portGrid}>
        {capabilities.map(([key, name]) => <div className={styles.port} key={key}><i /><span>{key}</span><small>{capabilityText(key, 'name', name)}</small></div>)}
      </div>
    </div>
  );
}

function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <section className={styles.heroCopy}>
          <Heading as="h1"><Translate id="homepage.hero.title">Build against one stable interface.</Translate></Heading>
          <p><Translate id="homepage.hero.subtitle">Use language models, retrieval, speech, and images in DSH plugins without rebuilding provider plumbing for every integration.</Translate></p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} to="/docs/getting-started/installation"><Translate id="homepage.hero.getStarted">Install the bundle</Translate><Arrow /></Link>
            <Link className={styles.secondaryAction} to="/docs/consumers/using-services"><Translate id="homepage.hero.contracts">Use the contracts</Translate><Arrow /></Link>
          </div>
          <p className={styles.compatibility}><Translate id="homepage.hero.compatibility">Independent project · DSH 0.2.x · English and Simplified Chinese</Translate></p>
        </section>
        <Backplane />
      </div>
      <div className={styles.proofStrip}>
        <div><b><Translate id="homepage.proof.connection.title">Configure once</Translate></b><span><Translate id="homepage.proof.connection.body">Reuse connections and credential references across capabilities.</Translate></span></div>
        <div><b><Translate id="homepage.proof.contract.title">Consume one contract</Translate></b><span><Translate id="homepage.proof.contract.body">Keep plugin code independent from vendor transports.</Translate></span></div>
        <div><b><Translate id="homepage.proof.gate.title">Coordinate capacity</Translate></b><span><Translate id="homepage.proof.gate.body">Share limits while reserving room for foreground work.</Translate></span></div>
      </div>
    </header>
  );
}

function Contract(): ReactNode {
  return (
    <section className={styles.contractSection}>
      <div className={styles.sectionIntro}>
        <Heading as="h2"><Translate id="homepage.contract.title">The abstraction is the product.</Translate></Heading>
        <p><Translate id="homepage.contract.subtitle">Consumer plugins call stable services. The runtime owns selection and coordination. Vendor packages own transport and useful provider-specific controls.</Translate></p>
      </div>
      <div className={styles.contractFlow}>
        <div><span>01</span><b><Translate id="homepage.contract.consumer.title">Consumer</Translate></b><p><Translate id="homepage.contract.consumer.body">Depends on shared types and requests a capability from the Cordis context.</Translate></p></div>
        <div><span>02</span><b><Translate id="homepage.contract.runtime.title">Runtime</Translate></b><p><Translate id="homepage.contract.runtime.body">Registers providers, resolves selections, normalizes failures, and gates concurrency.</Translate></p></div>
        <div><span>03</span><b><Translate id="homepage.contract.vendor.title">Vendor package</Translate></b><p><Translate id="homepage.contract.vendor.body">Resolves its connection and performs the provider-specific request.</Translate></p></div>
      </div>
      <div className={styles.codeProof}>
        <div><span>consumer.ts</span><code>{`const vectors = await ctx.embeddings.embed(texts, {\n  inputType: 'document',\n  signal,\n})`}</code></div>
        <p><Translate id="homepage.contract.note">The consumer does not handle the vendor credential, endpoint, batching, HTTP errors, or provider selection. Those concerns stay behind the service boundary.</Translate></p>
      </div>
    </section>
  );
}

function Registry(): ReactNode {
  return (
    <section className={styles.registrySection}>
      <div className={styles.registryHeading}>
        <Heading as="h2"><Translate id="homepage.registry.title">Implemented capability surface</Translate></Heading>
        <p><Translate id="homepage.registry.subtitle">One bundle installs the runtime and every provider maintained by this project. Install packages individually when a deployment needs less.</Translate></p>
      </div>
      <div className={styles.registry}>
        {capabilities.map(([key, name, description]) => {
          const slug = key === 'embed' ? 'embeddings' : key === 'rerank' ? 'reranking' : key === 'llm' ? 'language-models' : key === 'tts' ? 'text-to-speech' : key === 'stt' ? 'speech-to-text' : 'image-generation';
          const localizedName = capabilityText(key, 'name', name);
          return <div className={styles.registryRow} key={key}><code>{key}</code><b>{localizedName}</b><span>{capabilityText(key, 'description', description)}</span><Link to={`/docs/services/${slug}`} aria-label={translate({id: 'homepage.capability.docsAria', message: '{name} documentation'}, {name: localizedName})}><Arrow /></Link></div>;
        })}
      </div>
    </section>
  );
}

function Providers(): ReactNode {
  return (
    <section className={styles.providerSection}>
      <div>
        <Heading as="h2"><Translate id="homepage.providers.title">Interchangeable at the boundary. Specific where it matters.</Translate></Heading>
        <p><Translate id="homepage.providers.body">The common contract stays deliberately small. Provider packages can still expose model names, dimensions, voices, reasoning controls, and other options their services actually support.</Translate></p>
        <Link className={styles.textLink} to="/docs/concepts/architecture"><Translate id="homepage.providers.architecture">Read the architecture</Translate><Arrow /></Link>
      </div>
      <div className={styles.providerList}>
        {providers.map(([name, services]) => <div key={name}><b>{name}</b><code>{services}</code></div>)}
      </div>
    </section>
  );
}

function Close(): ReactNode {
  return (
    <section className={styles.close}>
      <div><Heading as="h2"><Translate id="homepage.close.title">Stop rebuilding the same integration layer.</Translate></Heading><p><Translate id="homepage.close.body">Install the maintained bundle, or depend on the core contract and the provider packages your plugin needs.</Translate></p></div>
      <div className={styles.actions}><Link className={styles.primaryAction} to="/docs/getting-started/installation"><Translate id="homepage.close.install">Installation</Translate><Arrow /></Link><Link className={styles.secondaryAction} to="/docs/providers/creating-provider"><Translate id="homepage.close.provider">Create a provider</Translate><Arrow /></Link></div>
    </section>
  );
}

export default function Home(): ReactNode {
  return <Layout title={translate({id: 'homepage.meta.title', message: 'Stable AI capability contracts for DSH plugins'})} description={translate({id: 'homepage.meta.description', message: 'Provider-neutral language model, retrieval, speech, and image services for DeepSeek Harness plugin developers.'})}><main className={styles.page}><Hero /><Contract /><Registry /><Providers /><Close /></main></Layout>;
}
