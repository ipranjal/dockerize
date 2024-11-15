import {generator} from "./generator.ts"
import * as path from "node:path";

export class pygen extends generator{
   base:string | undefined
   
   constructor(file:string){
     super(file);
     this.base = path.basename(file)
     
   }

    override getImage() {
       return "conda/miniconda3:latest";
    }

    override getPreRun(){
        return [
          ["conda", "create", "-n", "myenv", "python=3.10", "-y"]
        ]
    }

    

    override getPostRun(){
      return [
        ["/bin/bash", "-c", "source activate myenv && pip install pipreqs"],
        ["/bin/bash", "-c", "source activate myenv && pipreqs . --force"],
        ["/bin/bash", "-c", "source activate myenv && pip install -r requirements.txt"]
      ]
  }

    override getEnv() {
      return {
        "PATH": "/opt/conda/envs/myenv/bin:$PATH",
      };
    }

    override getCmd() {
      return["conda", "run", "-n", "myenv", "python", this.base];
     }


    async getPyVersion(){
        const command = new Deno.Command("vermin",{
            args:[
              "--no-tips",
              this.file,
            ],
            stdout: "piped",      // Capture the output
            stderr: "piped",      // Capture any errors
          });
          const { code, stdout, stderr } = await command.output();
          console.log(new TextDecoder().decode(stdout))
          console.log(new TextDecoder().decode(stderr))

          
          const output = new TextDecoder().decode(stdout)
          
          // Regular expression to match version numbers
          const versionRegex = /\d+\.\d+/g;
          
          // Find all versions in the output
          const versions = output.match(versionRegex);
          
          // If versions are found, parse them to numbers and find the maximum
          if (versions) {
            const maxVersion = Math.max(...versions.map(v => {
              const [major, minor] = v.split('.').map(Number);
              return major * 100 + minor; // Convert version to a number for comparison (e.g., 3.0 -> 300, 2.0 -> 200)
            }));
          
            // Convert back to a version string
            const maxVersionString = `${Math.floor(maxVersion / 100)}.${maxVersion % 100}`;
            if(maxVersionString == "3.0"){
              return "3.10";
            }else{
              return maxVersionString
            }
           
        }
    }
}