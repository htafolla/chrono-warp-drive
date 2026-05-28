import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const features = [
  {
    icon: '☀',
    title: 'Solar-Aligned',
    description: 'Every governance decision is cross-referenced against live NOAA GOES satellite data — an external, ungamable reference.',
  },
  {
    icon: '△',
    title: '4D Resonance Scoring',
    description: 'Proposals are scored across proximity, phase alignment, vortex volume, and temporal synchronization. An optional 5th dimension adds NeuralFusion spectral quality.',
  },
  {
    icon: '⚡',
    title: 'Real-Time & Adaptive',
    description: 'Decision thresholds shift dynamically with solar activity — stricter during storms, permissive during quiet periods.',
  },
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <img
          className={styles.heroLogo}
          src="/img/dynamo-logo.png"
          alt="Dynamo"
        />
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/overview">
            Read the Docs
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="https://dynamo.rippel.ai">
            Try Dynamo
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureCard({icon, title, description}: {icon: string; title: string; description: string}) {
  return (
    <div className="col col--4">
      <div className={styles.featureCard}>
        <span className={styles.featureIcon}>{icon}</span>
        <Heading as="h3">{title}</Heading>
        <p style={{color: 'var(--ifm-font-color-secondary)', margin: 0}}>{description}</p>
      </div>
    </div>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Solar-aligned AI governance — grounded in real-time solar physics">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map((f, i) => (
                <FeatureCard key={i} {...f} />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.quickStart}>
          <div className="container">
            <div className="row">
              <div className="col col--8 col--offset-2">
                <hr className={styles.divider} />
                <h2 style={{textAlign: 'center', marginBottom: '1.5rem'}}>Try It Now</h2>
                <div className={styles.quickStartCode}>
                  <pre style={{margin: 0, background: 'none', border: 'none', padding: 0}}>
                    <code>
{`curl -X POST https://mcp-production-80e2.up.railway.app/govern_with_solar \\
  -H "Content-Type: application/json" \\
  -d '{"proposal": "Deploy model v3 to 10% of traffic", "sharePublicly": true}'`}
                    </code>
                  </pre>
                </div>
                <div style={{textAlign: 'center', marginTop: '2rem'}}>
                  <Link className="button button--primary button--lg" to="/docs/overview">
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
