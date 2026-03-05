// Try nightly builds from Oct-Nov 2015 timeframe and also try optimization
const https = require('https');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'currency.sol'), 'utf8');
const onchainCreation = '6000603f53620f4240606060605990590160009052600081523381602001526000816040015280905020556106408061003960003961067956';
const onchainRuntime = '600061051f537c01000000000000000000000000000000000000000000000000000000006000350463c86a90fe';

function fetchSolc(filename) {
  return new Promise((resolve, reject) => {
    const url = `https://binaries.soliditylang.org/bin/${filename}`;
    https.get(url, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Get the full list to find nightlies
async function getVersionList() {
  return new Promise((resolve, reject) => {
    https.get('https://binaries.soliditylang.org/bin/list.json', (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function tryCompile(filename, optimize) {
  try {
    const solcSource = await fetchSolc(filename);
    const m = { exports: {} };
    const wrapper = `(function(module, exports, require) { ${solcSource} })`;
    const fn = eval(wrapper);
    fn(m, m.exports, require);
    const soljson = m.exports;
    
    const allFns = Object.keys(soljson).filter(k => typeof soljson[k] === 'function');
    const hasCompileJSON = allFns.includes('_compileJSON');
    
    if (!hasCompileJSON) return null;
    
    const compileFunc = soljson.cwrap('compileJSON', 'string', ['string', 'number']);
    const output = compileFunc(source, optimize ? 1 : 0);
    const result = JSON.parse(output);
    
    if (!result.contracts || !result.contracts.currency) return null;
    
    const bytecode = result.contracts.currency.bytecode.toLowerCase();
    return bytecode;
  } catch(e) {
    return null;
  }
}

async function main() {
  console.log('Fetching version list...');
  const list = await getVersionList();
  
  // Filter for nightlies from Sep-Dec 2015
  const nightlies = list.builds.filter(b => {
    const pre = b.prerelease || '';
    return pre.includes('nightly.2015.10') || pre.includes('nightly.2015.11') || 
           pre.includes('nightly.2015.9') || pre.includes('nightly.2015.12');
  });
  
  console.log(`Found ${nightlies.length} nightlies from Sep-Dec 2015`);
  
  for (const build of nightlies) {
    for (const opt of [0, 1]) {
      const label = `${build.path} (opt=${opt})`;
      process.stdout.write(`${label}... `);
      
      const bytecode = await tryCompile(build.path, opt);
      if (!bytecode) { console.log('failed'); continue; }
      
      // Check creation prefix
      if (bytecode.startsWith(onchainCreation.substring(0, 20))) {
        console.log(`CREATION PREFIX MATCH! (${bytecode.substring(0, 40)})`);
        // Full creation match?
        if (bytecode.startsWith(onchainCreation)) {
          console.log(`\n🎉 FULL CREATION MATCH: ${build.path} opt=${opt}`);
          process.exit(0);
        }
      }
      
      // Check if runtime is embedded
      const rtIdx = bytecode.indexOf(onchainRuntime);
      if (rtIdx >= 0) {
        console.log(`RUNTIME PREFIX found at ${rtIdx}!`);
      } else {
        // Quick check - does it produce the MSTORE8 pattern?
        if (bytecode.startsWith('6000603f53')) {
          console.log(`HAS MSTORE8 PATTERN! ${bytecode.substring(0, 60)}`);
        } else {
          console.log(`no match (${bytecode.substring(0, 20)})`);
        }
      }
    }
  }
  
  // Also try the stable releases with optimization
  const stables = ['soljson-v0.1.1+commit.6ff4cd6.js', 'soljson-v0.1.2+commit.d0d36e3.js', 'soljson-v0.1.3+commit.028f561d.js', 'soljson-v0.1.5+commit.23865e3.js', 'soljson-v0.1.6+commit.d41f8b7.js', 'soljson-v0.1.7+commit.b4e666c.js'];
  for (const s of stables) {
    process.stdout.write(`${s} (opt=1)... `);
    const bytecode = await tryCompile(s, 1);
    if (!bytecode) { console.log('failed'); continue; }
    if (bytecode.startsWith('6000603f53')) {
      console.log(`HAS MSTORE8 PATTERN! ${bytecode.substring(0, 60)}`);
    } else {
      console.log(`no match (${bytecode.substring(0, 20)})`);
    }
  }
  
  console.log('\n❌ No match found in nightlies');
}

main();
