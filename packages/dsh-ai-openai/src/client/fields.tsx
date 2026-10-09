import { useEffect, useState } from 'react'
import css from './LlmEditor.module.css'

/** A number the user types: kept as text while it is being typed, committed when it reads as a number, emptied to remove it. */
export function NumberField(props: { label: string; value: number | undefined; disabled: boolean; invalid: string; integer?: boolean; min?: number; max?: number; onChange: (value: number | undefined) => void }) {
  const [text, setText] = useState(props.value === undefined ? '' : String(props.value))
  useEffect(() => { setText(props.value === undefined ? '' : String(props.value)) }, [props.value])
  const parsed = text.trim() === '' ? undefined : Number(text)
  const bad = parsed !== undefined && (!Number.isFinite(parsed) || (props.integer === true && !Number.isInteger(parsed)) || (props.min !== undefined && parsed < props.min) || (props.max !== undefined && parsed > props.max))
  return (
    <label className={css.field}>
      <span>{props.label}</span>
      <input
        value={text} disabled={props.disabled} inputMode="decimal" aria-invalid={bad}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          const value = next.trim() === '' ? undefined : Number(next)
          if (value === undefined || (Number.isFinite(value) && !(props.integer === true && !Number.isInteger(value)) && !(props.min !== undefined && value < props.min) && !(props.max !== undefined && value > props.max))) props.onChange(value)
        }}
      />
      {bad && <small role="alert" className={css.error}>{props.invalid}</small>}
    </label>
  )
}

export function TextField(props: { label: string; value: string | undefined; disabled: boolean; placeholder?: string; hint?: string; onChange: (value: string) => void }) {
  return (
    <label className={css.field}>
      <span>{props.label}</span>
      <input value={props.value ?? ''} disabled={props.disabled} placeholder={props.placeholder} onChange={(event) => { props.onChange(event.target.value) }} />
      {props.hint !== undefined && <small>{props.hint}</small>}
    </label>
  )
}

/** A JSON object the user types: committed only while it parses to an object. */
export function JsonField(props: { label: string; value: Readonly<Record<string, unknown>> | undefined; disabled: boolean; invalid: string; hint?: string; onChange: (value: Record<string, unknown> | undefined) => void }) {
  const shown = props.value === undefined || Object.keys(props.value).length === 0 ? '' : JSON.stringify(props.value)
  const [text, setText] = useState(shown)
  const [bad, setBad] = useState(false)
  useEffect(() => { setText(shown); setBad(false) }, [shown])
  return (
    <label className={css.field}>
      <span>{props.label}</span>
      <input
        value={text} disabled={props.disabled} aria-invalid={bad} spellCheck={false}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          if (next.trim() === '') { setBad(false); props.onChange(undefined); return }
          try {
            const value = JSON.parse(next) as unknown
            if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('not an object')
            setBad(false)
            props.onChange(value as Record<string, unknown>)
          } catch { setBad(true) }
        }}
      />
      {props.hint !== undefined && <small>{props.hint}</small>}
      {bad && <small role="alert" className={css.error}>{props.invalid}</small>}
    </label>
  )
}

/** Words the user types separated by commas or new lines. */
export function ListField(props: { label: string; value: readonly string[] | undefined; disabled: boolean; hint?: string; onChange: (value: string[] | undefined) => void }) {
  const shown = (props.value ?? []).join(', ')
  const [text, setText] = useState(shown)
  useEffect(() => { setText(shown) }, [shown])
  return (
    <label className={css.field}>
      <span>{props.label}</span>
      <input
        value={text} disabled={props.disabled}
        onChange={(event) => {
          setText(event.target.value)
          const words = event.target.value.split(/[,\n]/).map(word => word.trim()).filter(word => word !== '')
          props.onChange(words.length === 0 ? undefined : words)
        }}
      />
      {props.hint !== undefined && <small>{props.hint}</small>}
    </label>
  )
}
