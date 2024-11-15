import * as dockergenerator from "npm:dockerfile-generator/lib/dockerGenerator.js";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { phpgen } from "./generators/phpgen.ts";
import { pygen } from "./generators/pygen.ts";

const args = parseArgs(Deno.args);
const file = args.file
let generator 

if(args.php){
  generator = new phpgen(file)
  generator.generateComposerJson()
  generator.insertRequireAutoload()
}else{
  generator = new pygen(file)
}



const input = []

// Add image
input.push({
  "from": {"baseImage":await generator.getImage()}
})

input.push({
  "working_dir":generator.getWorkDir()
})

//Copy files
generator.getCopy().forEach(copy => {
  input.push({"copy":copy})
})

// Add run command 

const preRunResults = await generator.getPreRun();
for (const run of preRunResults) {
  input.push({"run": run});
}


const postRunResults = await generator.getPostRun();
for (const run of postRunResults) {
  input.push({"run": run});
}

// set env
input.push({"env":generator.getEnv()})

if(generator.getExpose() != 0){
  input.push({"expose":[generator.getExpose()]})
}

// Cmd
input.push({"cmd":generator.getCmd()})

await Deno.writeTextFile("Dockerfile", dockergenerator.generateDockerFileFromArray(input));