import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './index.module.css';

type Capability = {
  name: ReactNode;
  description: ReactNode;
  mark: string;
};

const capabilities: Capability[] = [
  {
    mark: '↗',
    name: <Translate id="homepage.capability.models.title">Language models</Translate>,
    description: (
      <Translate id="homepage.capability.models.description">
        Register multiple OpenAI-compatible model routes in DSH.
      </Translate>
    ),
  },
  {
    mark: '⌁',
    name: <Translate id="homepage.capability.retrieval.title">Retrieval</Translate>,
    description: (
      <Translate id="homepage.capability.retrieval.description">
        Shared embedding and reranking services for search and memory.
      </Translate>
    ),
  },
  {
    mark: '◉',
    name: <Translate id="homepage.capability.media.title">Speech and images</Translate>,
    description: (
      <Translate id="homepage.capability.media.description">
        Provider-neutral TTS, file and live STT, and image generation.
      </Translate>
    ),
  },
];

function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={clsx('container', styles.heroInner)}>
        <div className={styles.eyebrow}>DSH · AI PROVIDER LAYER</div>
        <Heading as="h1" className={styles.title}>
          <Translate id="homepage.hero.title">
            One interface. The providers you choose.
          </Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="homepage.hero.subtitle">
            Configure credentials once. Give DeepSeek Harness plugins a shared foundation for models, retrieval, speech, and images.
          </Translate>
        </p>
        <div className={styles.actions}>
          <Link className="button button--primary button--lg" to="/docs/getting-started/installation">
            <Translate id="homepage.hero.getStarted">Get started</Translate>
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/concepts/architecture">
            <Translate id="homepage.hero.architecture">Explore the architecture</Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}

function CapabilityGrid(): ReactNode {
  return (
    <section className={styles.capabilities}>
      <div className="container">
        <div className={styles.sectionHeading}>
          <Heading as="h2">
            <Translate id="homepage.capabilities.title">A common layer for AI capabilities</Translate>
          </Heading>
          <p>
            <Translate id="homepage.capabilities.subtitle">
              Consumer plugins use stable contracts while vendor plugins handle reusable connections, credentials, and transport.
            </Translate>
          </p>
        </div>
        <div className={styles.grid}>
          {capabilities.map((capability) => (
            <article className={styles.card} key={capability.mark}>
              <span className={styles.mark} aria-hidden="true">{capability.mark}</span>
              <Heading as="h3">{capability.name}</Heading>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesignSummary(): ReactNode {
  return (
    <section className={styles.design}>
      <div className={clsx('container', styles.designInner)}>
        <div>
          <span className={styles.label}>
            <Translate id="homepage.design.label">Designed for plugins</Translate>
          </span>
          <Heading as="h2">
            <Translate id="homepage.design.title">Configure once, consume anywhere</Translate>
          </Heading>
        </div>
        <ul>
          <li><Translate id="homepage.design.connections">Reuse one connection across multiple capabilities.</Translate></li>
          <li><Translate id="homepage.design.live">Change selected providers without restarting the profile.</Translate></li>
          <li><Translate id="homepage.design.concurrency">Coordinate foreground and background work with shared concurrency rules.</Translate></li>
          <li><Translate id="homepage.design.foundation">Install it as infrastructure for other plugins; it makes no AI requests on its own.</Translate></li>
          <li><Translate id="homepage.design.future">Add more vendors and services without redesigning every consumer plugin.</Translate></li>
        </ul>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title={translate({id: 'homepage.meta.title', message: 'AI services for DSH plugins'})}
      description={translate({id: 'homepage.meta.description', message: 'Configure credentials once and provide reusable AI capabilities to DeepSeek Harness plugins.'})}>
      <main>
        <Hero />
        <CapabilityGrid />
        <DesignSummary />
      </main>
    </Layout>
  );
}
