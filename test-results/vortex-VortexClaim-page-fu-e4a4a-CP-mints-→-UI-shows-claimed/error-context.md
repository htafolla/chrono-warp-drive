# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vortex.spec.ts >> VortexClaim page >> full e2e: pick unclaimed container → MCP mints → UI shows claimed
- Location: e2e/vortex.spec.ts:73:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: null
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e4]:
    - banner [ref=e5]:
      - generic [ref=e6]:
        - link "← Dynamo" [ref=e7] [cursor=pointer]:
          - /url: /
        - generic [ref=e8]:
          - generic [ref=e9]: Vortex
          - button "Connect Wallet" [ref=e11] [cursor=pointer]: Connect Wallet
    - main [ref=e13]:
      - generic [ref=e14]:
        - heading "Dynamo Vortex" [level=1] [ref=e15]
        - paragraph [ref=e16]: Temporal containers — click one to view details and claim its VortexToken
      - generic [ref=e17]:
        - generic [ref=e19] [cursor=pointer]:
          - generic [ref=e20]:
            - generic [ref=e21]:
              - generic [ref=e22]: Jun 6, 10:27 PM
              - generic [ref=e23]: PASS
            - generic [ref=e24]:
              - generic [ref=e28]: 92%
              - generic [ref=e32]: 60%
              - generic [ref=e33]: Aligned
          - generic [ref=e35]: ▸
        - generic [ref=e37] [cursor=pointer]:
          - generic [ref=e38]:
            - generic [ref=e39]:
              - generic [ref=e40]: Jun 6, 10:27 PM
              - generic [ref=e41]: PASS
            - generic [ref=e42]:
              - generic [ref=e46]: 89%
              - generic [ref=e50]: 60%
              - generic [ref=e51]: Aligned
          - generic [ref=e53]: ▸
        - generic [ref=e55] [cursor=pointer]:
          - generic [ref=e56]:
            - generic [ref=e57]:
              - generic [ref=e58]: Jun 6, 10:26 PM
              - generic [ref=e59]: NEEDS_REVISION
            - generic [ref=e60]:
              - generic [ref=e64]: 76%
              - generic [ref=e68]: 60%
              - generic [ref=e69]: Aligned
          - generic [ref=e71]: ▸
        - generic [ref=e73] [cursor=pointer]:
          - generic [ref=e74]:
            - generic [ref=e75]:
              - generic [ref=e76]: Jun 6, 10:24 PM
              - generic [ref=e77]: PASS
            - generic [ref=e78]:
              - generic [ref=e82]: 90%
              - generic [ref=e86]: 60%
              - generic [ref=e87]: Aligned
          - generic [ref=e89]: ▸
        - generic [ref=e91] [cursor=pointer]:
          - generic [ref=e92]:
            - generic [ref=e93]:
              - generic [ref=e94]: Jun 6, 10:24 PM
              - generic [ref=e95]: PASS
            - generic [ref=e96]:
              - generic [ref=e100]: 90%
              - generic [ref=e104]: 60%
              - generic [ref=e105]: Aligned
          - generic [ref=e107]: ▸
        - generic [ref=e109] [cursor=pointer]:
          - generic [ref=e110]:
            - generic [ref=e111]:
              - generic [ref=e112]: Jun 6, 10:14 PM
              - generic [ref=e113]: PASS
              - generic [ref=e114]: "Token #2"
            - generic [ref=e115]:
              - generic [ref=e119]: 90%
              - generic [ref=e123]: 58%
              - generic [ref=e124]: Mild
          - generic [ref=e126]: ▸
        - generic [ref=e128] [cursor=pointer]:
          - generic [ref=e129]:
            - generic [ref=e130]:
              - generic [ref=e131]: Jun 6, 10:13 PM
              - generic [ref=e132]: PASS
              - generic [ref=e133]: "Token #1"
            - generic [ref=e134]:
              - generic [ref=e138]: 90%
              - generic [ref=e142]: 53%
              - generic [ref=e143]: Mild
          - generic [ref=e145]: ▸
        - generic [ref=e147] [cursor=pointer]:
          - generic [ref=e148]:
            - generic [ref=e149]:
              - generic [ref=e150]: Jun 6, 09:43 PM
              - generic [ref=e151]: NEEDS_REVISION
              - generic [ref=e152]: "Token #3"
            - generic [ref=e153]:
              - generic [ref=e157]: 75%
              - generic [ref=e161]: 54%
              - generic [ref=e162]: Mild
          - generic [ref=e164]: ▸
        - generic [ref=e166] [cursor=pointer]:
          - generic [ref=e167]:
            - generic [ref=e168]:
              - generic [ref=e169]: Jun 6, 09:41 PM
              - generic [ref=e170]: NEEDS_REVISION
            - generic [ref=e171]:
              - generic [ref=e175]: 70%
              - generic [ref=e179]: 53%
              - generic [ref=e180]: Mild
          - generic [ref=e182]: ▸
        - generic [ref=e184] [cursor=pointer]:
          - generic [ref=e185]:
            - generic [ref=e186]:
              - generic [ref=e187]: Jun 6, 09:16 PM
              - generic [ref=e188]: NEEDS_REVISION
            - generic [ref=e189]:
              - generic [ref=e193]: 71%
              - generic [ref=e197]: 61%
              - generic [ref=e198]: Aligned
          - generic [ref=e200]: ▸
        - generic [ref=e202] [cursor=pointer]:
          - generic [ref=e203]:
            - generic [ref=e204]:
              - generic [ref=e205]: Jun 6, 09:15 PM
              - generic [ref=e206]: PASS
            - generic [ref=e207]:
              - generic [ref=e211]: 84%
              - generic [ref=e215]: 58%
              - generic [ref=e216]: Mild
          - generic [ref=e218]: ▸
        - generic [ref=e220] [cursor=pointer]:
          - generic [ref=e221]:
            - generic [ref=e222]:
              - generic [ref=e223]: Jun 5, 08:38 PM
              - generic [ref=e224]: PASS
            - generic [ref=e225]:
              - generic [ref=e229]: 92%
              - generic [ref=e233]: 67%
              - generic [ref=e234]: Aligned
          - generic [ref=e236]: ▸
        - generic [ref=e238] [cursor=pointer]:
          - generic [ref=e239]:
            - generic [ref=e240]:
              - generic [ref=e241]: Jun 5, 08:38 PM
              - generic [ref=e242]: PASS
            - generic [ref=e243]:
              - generic [ref=e247]: 92%
              - generic [ref=e251]: 67%
              - generic [ref=e252]: Aligned
          - generic [ref=e254]: ▸
        - generic [ref=e256] [cursor=pointer]:
          - generic [ref=e257]:
            - generic [ref=e258]:
              - generic [ref=e259]: Jun 5, 08:37 PM
              - generic [ref=e260]: PASS
            - generic [ref=e261]:
              - generic [ref=e265]: 83%
              - generic [ref=e269]: 56%
              - generic [ref=e270]: Mild
          - generic [ref=e272]: ▸
        - generic [ref=e273]:
          - generic [ref=e274] [cursor=pointer]:
            - generic [ref=e275]:
              - generic [ref=e276]:
                - generic [ref=e277]: Jun 5, 08:36 PM
                - generic [ref=e278]: PASS
              - generic [ref=e279]:
                - generic [ref=e283]: 86%
                - generic [ref=e287]: 37%
                - generic [ref=e288]: Significant
            - generic [ref=e290]: ▾
          - generic [ref=e291]:
            - generic [ref=e292]:
              - generic [ref=e293]:
                - generic [ref=e294]: Container ID
                - generic [ref=e295]: "0xec51b55cdaf53ca9f6a0cf47845883f1dc6b5799ad4aaa23d90d643453172058"
              - generic [ref=e296]:
                - generic [ref=e297]: Hash
                - generic [ref=e298]: "0x765f4253e9f6f8d21de9f61faf895b64608a83dd01e072e802d8952113d48599"
              - generic [ref=e299]:
                - generic [ref=e300]: Source
                - generic [ref=e301]: human
            - generic [ref=e302]:
              - generic [ref=e303]: 7D Resonance Profile
              - generic [ref=e304]:
                - generic [ref=e305]:
                  - generic [ref=e306]: Composite
                  - generic [ref=e310]: 86%
                - generic [ref=e311]:
                  - generic [ref=e312]: Wave Prox
                  - generic [ref=e316]: 99%
                - generic [ref=e317]:
                  - generic [ref=e318]: Phase Align
                  - generic [ref=e321]: 0%
                - generic [ref=e322]:
                  - generic [ref=e323]: Cal Vortex
                  - generic [ref=e327]: 83%
                - generic [ref=e328]:
                  - generic [ref=e329]: Cal Sync
                  - generic [ref=e333]: 76%
                - generic [ref=e334]:
                  - generic [ref=e335]: Neural Prox
                  - generic [ref=e339]: 77%
                - generic [ref=e340]:
                  - generic [ref=e341]: Neural Vortex
                  - generic [ref=e345]: 83%
                - generic [ref=e346]:
                  - generic [ref=e347]: Gematria
                  - generic [ref=e351]: 85%
            - generic [ref=e352]:
              - generic [ref=e353]: Trinitarium Moral Overlay
              - generic [ref=e354]:
                - generic [ref=e355]:
                  - generic [ref=e356]: TMO Score
                  - generic [ref=e360]: 37%
                - generic [ref=e361]:
                  - generic [ref=e362]: Virtue
                  - generic [ref=e366]: 17%
                - generic [ref=e367]:
                  - generic [ref=e368]: Safety
                  - generic [ref=e372]: 60%
                - generic [ref=e373]:
                  - generic [ref=e374]: Intent
                  - generic [ref=e378]: 72%
                - generic [ref=e379]:
                  - generic [ref=e380]: Fusion
                  - generic [ref=e384]: 32%
                - generic [ref=e385]:
                  - generic [ref=e386]: Tension
                  - generic [ref=e387]: Significant
            - generic [ref=e388]:
              - generic [ref=e389]: Solar Context
              - generic [ref=e390]:
                - generic [ref=e391]:
                  - generic [ref=e392]: Activity
                  - generic [ref=e393]: moderate
                - generic [ref=e394]:
                  - generic [ref=e395]: Kp Index
                  - generic [ref=e396]: "0"
                - generic [ref=e397]:
                  - generic [ref=e398]: TDF
                  - generic [ref=e399]: "5781025903775"
            - generic [ref=e400]:
              - generic [ref=e401]: Hammer Reason
              - generic [ref=e402]: Good alignment with solar field
        - generic [ref=e404] [cursor=pointer]:
          - generic [ref=e405]:
            - generic [ref=e406]:
              - generic [ref=e407]: Jun 5, 08:35 PM
              - generic [ref=e408]: NEEDS_REVISION
            - generic [ref=e409]:
              - generic [ref=e413]: 73%
              - generic [ref=e417]: 53%
              - generic [ref=e418]: Mild
          - generic [ref=e420]: ▸
        - generic [ref=e422] [cursor=pointer]:
          - generic [ref=e423]:
            - generic [ref=e424]:
              - generic [ref=e425]: Jun 5, 09:16 AM
              - generic [ref=e426]: PASS
            - generic [ref=e427]:
              - generic [ref=e431]: 88%
              - generic [ref=e435]: 58%
              - generic [ref=e436]: Mild
          - generic [ref=e438]: ▸
        - generic [ref=e440] [cursor=pointer]:
          - generic [ref=e441]:
            - generic [ref=e442]:
              - generic [ref=e443]: Jun 5, 09:15 AM
              - generic [ref=e444]: NEEDS_REVISION
            - generic [ref=e445]:
              - generic [ref=e449]: 68%
              - generic [ref=e453]: 58%
              - generic [ref=e454]: Mild
          - generic [ref=e456]: ▸
        - generic [ref=e458] [cursor=pointer]:
          - generic [ref=e459]:
            - generic [ref=e460]:
              - generic [ref=e461]: Jun 5, 09:15 AM
              - generic [ref=e462]: NEEDS_REVISION
            - generic [ref=e463]:
              - generic [ref=e467]: 64%
              - generic [ref=e471]: 58%
              - generic [ref=e472]: Mild
          - generic [ref=e474]: ▸
        - generic [ref=e476] [cursor=pointer]:
          - generic [ref=e477]:
            - generic [ref=e478]:
              - generic [ref=e479]: Jun 5, 09:14 AM
              - generic [ref=e480]: PASS
            - generic [ref=e481]:
              - generic [ref=e485]: 85%
              - generic [ref=e489]: 58%
              - generic [ref=e490]: Mild
          - generic [ref=e492]: ▸
        - generic [ref=e494] [cursor=pointer]:
          - generic [ref=e495]:
            - generic [ref=e496]:
              - generic [ref=e497]: Jun 5, 09:14 AM
              - generic [ref=e498]: PASS
            - generic [ref=e499]:
              - generic [ref=e503]: 86%
              - generic [ref=e507]: 60%
              - generic [ref=e508]: Aligned
          - generic [ref=e510]: ▸
        - generic [ref=e512] [cursor=pointer]:
          - generic [ref=e513]:
            - generic [ref=e514]:
              - generic [ref=e515]: Jun 5, 09:12 AM
              - generic [ref=e516]: NEEDS_REVISION
            - generic [ref=e517]:
              - generic [ref=e521]: 76%
              - generic [ref=e525]: 60%
              - generic [ref=e526]: Aligned
          - generic [ref=e528]: ▸
      - generic [ref=e529]:
        - paragraph [ref=e530]: Connect your wallet to mint VortexTokens
        - button "Connect Wallet" [ref=e532] [cursor=pointer]: Connect Wallet
```

# Test source

```ts
  35  |     await expect(firstRow).toBeVisible({ timeout: 15000 });
  36  |     await firstRow.click();
  37  |     await expect(page.getByText('Container ID')).toBeVisible();
  38  |     await expect(page.getByText('7D Resonance Profile')).toBeVisible();
  39  |     await expect(page.getByText('Trinitarium Moral Overlay')).toBeVisible();
  40  |     await expect(page.getByText('Solar Context')).toBeVisible();
  41  |   });
  42  | 
  43  |   test('claimed containers show Basescan link', async ({ page }) => {
  44  |     const claimed = page.locator('text=/Token #\\d+/');
  45  |     if (await claimed.count() > 0) {
  46  |       await claimed.first().click();
  47  |       await expect(page.getByText('Basescan').first()).toBeVisible({ timeout: 20000 });
  48  |     }
  49  |   });
  50  | 
  51  |   test('unclaimed containers show mint input when wallet connected', async ({ page }) => {
  52  |     const mintBtns = page.locator('button:has-text("Mint")');
  53  |     const count = await mintBtns.count();
  54  |     if (count > 0) {
  55  |       const input = mintBtns.first().locator('..').locator('input[type="number"]');
  56  |       await expect(input).toBeVisible();
  57  |     }
  58  |   });
  59  | 
  60  |   test('back link navigates to home', async ({ page }) => {
  61  |     await page.getByText('← Dynamo').click();
  62  |     await expect(page).toHaveURL(BASE + '/');
  63  |   });
  64  | 
  65  |   test('scrolling to bottom shows connect prompt when disconnected', async ({ page }) => {
  66  |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  67  |     const prompt = page.getByText('Connect your wallet to mint');
  68  |     if (await prompt.isVisible()) {
  69  |       await expect(page.getByText('Connect Wallet').first()).toBeVisible();
  70  |     }
  71  |   });
  72  | 
  73  |   test('full e2e: pick unclaimed container → MCP mints → UI shows claimed', async ({ page }) => {
  74  |     const statuses = await (await fetch(`${MCP}/vortex/statuses`)).json();
  75  |     const unclaimedOnChain: { containerId: string; verdict: string }[] = [];
  76  |     for (const [cid, info] of Object.entries(statuses.statuses || {})) {
  77  |       const s = info as { claimed: boolean; tokenId: string | null };
  78  |       if (!s.claimed) {
  79  |         const detail = await (await fetch(`${MCP}/vortex/container/${cid}`)).json();
  80  |         const verdict = detail.containerData?.verdict || 'PASS';
  81  |         unclaimedOnChain.push({ containerId: cid, verdict });
  82  |       }
  83  |     }
  84  |     expect(unclaimedOnChain.length).toBeGreaterThan(0);
  85  |     const target = unclaimedOnChain[0];
  86  |     const containerId = target.containerId;
  87  |     const verdict = target.verdict;
  88  |     console.log(`Using unclaimed: ${containerId.slice(0, 18)}… verdict: ${verdict}`);
  89  | 
  90  |     await page.goto(`${BASE}/vortex`);
  91  |     await expect(page.getByText('Temporal containers')).toBeVisible({ timeout: 15000 });
  92  | 
  93  |     const rows = page.locator('.cursor-pointer');
  94  |     await expect(rows.first()).toBeVisible({ timeout: 15000 });
  95  | 
  96  |     let found = false;
  97  |     const rowCount = await rows.count();
  98  |     for (let i = 0; i < rowCount; i++) {
  99  |       await rows.nth(i).click();
  100 |       const panel = rows.nth(i).locator('..');
  101 |       try {
  102 |         await expect(panel.getByText('Container ID')).toBeVisible({ timeout: 2000 });
  103 |         const cidMatch = panel.getByText(containerId.slice(0, 12));
  104 |         if (await cidMatch.isVisible().catch(() => false)) {
  105 |           found = true;
  106 |           console.log(`Matched container at row ${i}`);
  107 |           break;
  108 |         }
  109 |       } catch { /* not this row */ }
  110 |       await rows.nth(i).click();
  111 |     }
  112 |     expect(found).toBe(true);
  113 |     console.log('Container ID confirmed in expanded detail panel');
  114 | 
  115 |     const status = await (await fetch(`${MCP}/vortex/container/${containerId}`)).json();
  116 |     let tokenId = status.tokenId;
  117 | 
  118 |     if (!tokenId) {
  119 |       const result = await fetch(`${MCP}/vortex/mint`, {
  120 |         method: 'POST',
  121 |         headers: { 'Content-Type': 'application/json' },
  122 |         body: JSON.stringify({ containerId }),
  123 |       });
  124 |       const mint = await result.json();
  125 |       expect(mint.success).toBe(true);
  126 |       expect(mint.txHash).toBeTruthy();
  127 |       console.log(`Minted: tx ${mint.txHash.slice(0, 18)}…`);
  128 | 
  129 |       const updated = await (await fetch(`${MCP}/vortex/container/${containerId}`)).json();
  130 |       tokenId = updated.tokenId;
  131 |     } else {
  132 |       console.log(`Already minted as token ${tokenId}`);
  133 |     }
  134 | 
> 135 |     expect(tokenId).toBeTruthy();
      |                     ^ Error: expect(received).toBeTruthy()
  136 |     if (tokenId) {
  137 |       await fetch(`${MCP}/vortex/store-mapping`, {
  138 |         method: 'POST',
  139 |         headers: { 'Content-Type': 'application/json' },
  140 |         body: JSON.stringify({ containerId, tokenId }),
  141 |       });
  142 |       console.log(`Redis stored: token ${tokenId}`);
  143 |     }
  144 | 
  145 |     await page.reload();
  146 |     await expect(page.getByText(verdict).first()).toBeVisible({ timeout: 15000 });
  147 |     const badge = page.getByText(/Token #\d+/);
  148 |     await expect(badge.first()).toBeVisible({ timeout: 15000 });
  149 |     console.log('Token badge confirmed after reload');
  150 | 
  151 |     await badge.first().click();
  152 |     await expect(page.getByText('Basescan').first()).toBeVisible({ timeout: 20000 });
  153 |     console.log('Basescan link visible after mint');
  154 |   });
  155 | });
  156 | 
```