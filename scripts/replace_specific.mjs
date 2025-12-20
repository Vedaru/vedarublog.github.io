import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();
const target = process.argv[2];
const replacement = process.argv[3];
if (!target || !replacement) {
  console.error('Usage: node replace_specific.mjs <target> <replacement>');
  process.exit(2);
}

const textExts = new Set(['.md','.mdx','.astro','.ts','.tsx','.js','.jsx','.mjs','.html','.svelte','.json','.jsonc','.css','.scss','.yml','.yaml']);

async function walk(dir, cb){
  const entries = await fs.readdir(dir,{withFileTypes:true});
  for(const e of entries){
    if(e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(dir,e.name);
    if(e.isDirectory()) await walk(full, cb);
    else if(e.isFile()) await cb(full);
  }
}

async function run(){
  console.log(`Replacing ${target} -> ${replacement} under ${root}`);
  let changed=0;
  await walk(root, async (file)=>{
    const ext = path.extname(file).toLowerCase();
    if(!textExts.has(ext)) return;
    try{
      const s = await fs.readFile(file,'utf8');
      if(s.includes(target)){
        await fs.writeFile(file, s.split(target).join(replacement), 'utf8');
        console.log('Updated:', path.relative(root,file));
        changed++;
      }
    }catch(e){/* ignore */}
  });
  console.log('Done. Files changed:', changed);
}

run().catch(e=>{console.error(e);process.exit(1);});
