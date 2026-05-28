import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function About(): ReactNode {
  return (
    <Layout title="About" description="About Dynamo and its creator">
      <main>
        <div className="container" style={{padding: '3rem 0', maxWidth: '720px'}}>
          <h1>About Dynamo</h1>
          <p>
            Dynamo is a solar-aligned AI governance system. It evaluates proposals
            by measuring their resonance against the Sun's current electromagnetic
            and particle environment — using live data from NOAA GOES satellites.
          </p>
          <p>
            The concept is simple: any AI governance system that references only itself
            will eventually optimize for its own reflection. The Sun provides an external,
            verifiable, ungamable, and continuously variable reference frame.
          </p>

          <h2>The Problem</h2>
          <p>
            Existing AI governance approaches are circular. Human feedback loops back
            into the same system. Constitutional AI evaluates itself. Debate stays
            internal. No reference exists outside the system being governed.
          </p>
          <p>
            Dynamo breaks this circularity by introducing the Sun as the reference.
            No proposal can change solar weather. The reference is independent,
            globally verifiable, and continuously variable.
          </p>

          <h2>How It Works</h2>
          <p>
            Each proposal is fingerprinted into a Temporal Displacement Factor (TDF).
            The TDF is cross-correlated against the Sun's current solar parameters
            from NOAA GOES satellites. A resonance score is calculated across four
            dimensions — proximity, phase alignment, vortex alignment, and synchronization.
            The score is compared against adaptive thresholds based on solar activity,
            producing a verdict: PASS, NEEDS_REVISION, or REJECT.
          </p>

          <h2>0xRay Integration</h2>
          <p>
            Dynamo is the solar governance signal layer for{' '}
            <a href="https://www.npmjs.com/package/strray-ai"><strong>0xRay</strong></a>
            {' '}(formerly StringRay), a multi-agent orchestration framework. 0xRay
            provides a 3-agent voting committee that uses Dynamo's solar resonance
            scores as an external governance boundary — ensuring no AI agent vote
            proceeds without checking the Sun.
          </p>
          <p>
            Together, Dynamo and 0xRay create a self-healing governance loop where
            proposals are evaluated by agent consensus, validated against solar
            physics, and either passed or flagged for revision.
          </p>
          <p>
            <a href="https://www.npmjs.com/package/strray-ai">0xRay on npm</a>
            {' · '}
            <a href="https://github.com/htafolla/stringray">GitHub</a>
            {' '}<em>(moving to 0xRay org)</em>
          </p>

          <h2>Open Source</h2>
          <p>
            Dynamo is open source on{' '}
            <Link to="https://github.com/htafolla/chrono-warp-drive">GitHub</Link>.
            The codebase includes the MCP server, React frontend, and all formulas.
          </p>

          <h2>Built By</h2>
          <p>
            <strong>@blaze0x1</strong> —{' '}
            <Link to="https://x.com/blaze0x1">X / Twitter</Link>
            {' | '}
            <Link to="https://github.com/htafolla">GitHub</Link>
          </p>
          <p>
            If you have questions, ideas, or just want to talk about solar governance
            and temporal physics, reach out on X.
          </p>
        </div>
      </main>
    </Layout>
  );
}
