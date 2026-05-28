import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
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
            to="https://dynamo.rippel.ai"
            style={{marginLeft: '1rem'}}>
            Try Dynamo
          </Link>
        </div>
      </div>
    </header>
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
        <div className="container" style={{padding: '3rem 0'}}>
          <div className="row">
            <div className="col col--6 col--offset-3">
              <h2>What is Dynamo?</h2>
              <p>
                Dynamo evaluates AI governance proposals by measuring their resonance
                against the Sun&apos;s current electromagnetic and particle environment,
                using live data from NOAA GOES satellites.
              </p>
              <p>
                It breaks the circularity problem in AI governance by introducing an
                external, ungamable reference: the Sun.
              </p>
              <h2>Quick Start</h2>
              <pre style={{background: 'var(--ifm-pre-background)', padding: '1rem', borderRadius: 'var(--ifm-pre-border-radius)'}}>
                <code>
{`curl -X POST https://mcp-production-80e2.up.railway.app/govern_with_solar \\
  -H "Content-Type: application/json" \\
  -d '{"proposal": "Deploy model v3 to 10% of traffic", "sharePublicly": true}'`}
                </code>
              </pre>
              <div style={{textAlign: 'center', marginTop: '2rem'}}>
                <Link className="button button--primary button--lg" to="/docs/overview">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
