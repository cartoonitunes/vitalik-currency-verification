// Use cwrap to access the low-level compile functions in old soljson
const https = require('https');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'currency.sol'), 'utf8');
const onchainRuntime = '600061051f537c01000000000000000000000000000000000000000000000000000000006000350463c86a90fe81141561019b57365990590160009052366004823760043560605260243560805250606051606060605990590160009052600081523381602001526000816040015280905020541215156100865760006060511215610089565b60005b156100a957700100000000000000000000000000000000606051126100ac565b60005b1561018e5760605160606060599059016000905260008152338160200152600081604001528090502054036060606059905901600090526000815233816020015260008160400152809050205560605160606060599059016000905260008152608051816020015260008160400152809050205401606060605990590160009052600081526080518160200152600081604001528090502055601c60405990590160009052016060518152608051337fa9ba2cffdaa9586597138c75c9ed44a43a3d45760a05b942dd6db22f58c8690c602084a3506001610160526020610160f35b6000610180526020610180f35b6367eae6728114156103c15736599059016000905236600482376004356101a05260243560605260443560805250608060805990590160009052600081526101a05181602001526001816040015233816060015280905020546101c052606051606060605990590160009052600081526101a0518160200152600081604001528090502054121515610235576060516101c0511215610238565b60005b15610249576000606051121561024c565b60005b1561026c577001000000000000000000000000000000006060511261026f565b60005b156103b457606051608060805990590160009052600081526101a051816020015260018160400152338160600152809050205403608060805990590160009052600081526101a0518160200152600181604001523381606001528090502055606051606060605990590160009052600081526101a051816020015260008160400152809050205403606060605990590160009052600081526101a051816020015260008160400152809050205560605160606060599059016000905260008152608051816020015260008160400152809050205401606060605990590160009052600081526080518160200152600081604001528090502055601c604059905901600090520160605181526080516101a0517fa9ba2cffdaa9586597138c75c9ed44a43a3d45760a05b942dd6db22f58c8690c602084a35060016102e05260206102e0f35b6000610300526020610300f35b63d26c8a8a8114156103fa5760606060599059016000905260008152338160200152600081604001528090502054610320526020610320f35b63bbd39ac081141561044c573659905901600090523660048237600435610360525060606060599059016000905260008152610360518160200152600081604001528090502054610380526020610380f35b63daea85c58114156104ac5736599059016000905236600482376004356103605250700100000000000000000000000000000000608060805990590160009052600081523381602001526001816040015261036051816060015280905020555b63673448dd8114156105075736599059016000905236600482376004356103e05250600060806080599059016000905260008152338160200152600181604001526103e0518160600152809050205413610400526020610400f35b63930b7a2381141561058c573659905901600090523660048237600435610360526024356104405250610440516080608059905901600090526000815233816020015260018160400152610360518160600152809050205401608060805990590160009052600081533381602001526001816040015261036051816060015280905020555b63181670e68114156105ee5736599059016000905236600482376004356104a0526024356103e05250608060805990590160009052600081526104a0518160200152600181604001526103e051816060015280905020546104c05260206104c0f35b6315770d9981141561063e57365990590160009052366004823760043561036052506000608060805990590160009052600081533381602001526001816040015261036051816060015280905020555b50';

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

const versions = [
  'soljson-v0.1.1+commit.6ff4cd6.js',
  'soljson-v0.1.2+commit.d0d36e3.js',
  'soljson-v0.1.3+commit.028f561d.js',
  'soljson-v0.1.5+commit.23865e3.js',
  'soljson-v0.1.6+commit.d41f8b7.js',
  'soljson-v0.1.7+commit.b4e666c.js',
  'soljson-v0.2.0+commit.4dc2445.js',
  'soljson-v0.2.1+commit.91a6b35.js',
  'soljson-v0.2.2+commit.ef92f56.js',
  'soljson-v0.3.0+commit.11d6736.js',
  'soljson-v0.3.1+commit.c492d9b.js',
  'soljson-v0.3.2+commit.81ae2a7.js',
  'soljson-v0.3.6+commit.3fc68da.js',
];

async function main() {
  for (const filename of versions) {
    console.log(`\n=== ${filename} ===`);
    
    try {
      const solcSource = await fetchSolc(filename);
      const m = { exports: {} };
      const wrapper = `(function(module, exports, require) { ${solcSource} })`;
      const fn = eval(wrapper);
      fn(m, m.exports, require);
      const soljson = m.exports;
      
      // Use cwrap to access compile functions
      let compileFunc;
      
      // Check for available compile functions
      const allFns = Object.keys(soljson).filter(k => typeof soljson[k] === 'function');
      const hasCompileJSON = allFns.includes('_compileJSON');
      const hasCompileJSONMulti = allFns.includes('_compileJSONMulti');
      const hasCompileJSONCallback = allFns.includes('_compileJSONCallback');
      
      console.log(`  _compileJSON: ${hasCompileJSON}, _compileJSONMulti: ${hasCompileJSONMulti}, _compileJSONCallback: ${hasCompileJSONCallback}`);
      
      let result;
      
      if (hasCompileJSON) {
        compileFunc = soljson.cwrap('compileJSON', 'string', ['string', 'number']);
        const output = compileFunc(source, 0);
        result = JSON.parse(output);
      } else if (hasCompileJSONMulti) {
        compileFunc = soljson.cwrap('compileJSONMulti', 'string', ['string', 'number']);
        const input = JSON.stringify({ sources: { 'currency.sol': source } });
        const output = compileFunc(input, 0);
        result = JSON.parse(output);
      } else if (hasCompileJSONCallback) {
        // compileJSONCallback takes (input, optimize, readCallback)
        // For old versions without imports, we can use null for callback
        compileFunc = soljson.cwrap('compileJSONCallback', 'string', ['string', 'number', 'number']);
        const input = JSON.stringify({ sources: { 'currency.sol': source } });
        const output = compileFunc(input, 0, 0);
        result = JSON.parse(output);
      } else {
        console.log('  No compile function available');
        continue;
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log(`  Errors: ${JSON.stringify(result.errors).substring(0, 200)}`);
        // Check if any are fatal
        const fatal = result.errors.some(e => typeof e === 'string' ? !e.includes('Warning') : e.severity === 'error');
        if (fatal && !result.contracts) continue;
      }
      
      if (!result.contracts) {
        console.log('  No contracts produced');
        continue;
      }
      
      const keys = Object.keys(result.contracts);
      console.log(`  Contract keys: ${keys}`);
      
      for (const key of keys) {
        const contract = result.contracts[key];
        const bytecode = (contract.bytecode || '').toLowerCase();
        
        if (!bytecode) {
          console.log(`  ${key}: no bytecode`);
          continue;
        }
        
        console.log(`  ${key}: bytecode length=${bytecode.length}`);
        console.log(`  First 80: ${bytecode.substring(0, 80)}`);
        
        // The bytecode from compile is creation code, check if runtime is embedded
        const idx = bytecode.indexOf(onchainRuntime.substring(0, 60));
        if (idx >= 0) {
          const extracted = bytecode.substring(idx, idx + onchainRuntime.length);
          if (extracted === onchainRuntime) {
            console.log(`  ✅ RUNTIME MATCH at offset ${idx} in creation bytecode!`);
            console.log(`  🎉 VERIFIED with ${filename}`);
            process.exit(0);
          } else {
            console.log(`  Partial runtime match at offset ${idx}, diverges after some bytes`);
            // Find where it diverges
            let matchLen = 0;
            for (let i = 0; i < onchainRuntime.length && (idx + i) < bytecode.length; i++) {
              if (bytecode[idx + i] === onchainRuntime[i]) matchLen++;
              else break;
            }
            console.log(`  Matches ${matchLen}/${onchainRuntime.length} chars`);
          }
        } else {
          // Check prefix match
          let match = 0;
          const expected = '6000603f53620f4240'; // start of creation code
          for (let i = 0; i < Math.min(bytecode.length, expected.length); i++) {
            if (bytecode[i] === expected[i]) match++;
            else break;
          }
          console.log(`  Creation prefix match: ${match}/${expected.length} chars`);
        }
      }
    } catch(e) {
      console.log(`  Error: ${e.message.substring(0, 150)}`);
    }
  }
  
  console.log('\n❌ No match found');
}

main();
