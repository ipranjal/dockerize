import { generator } from "./generator.ts";
import * as path from "node:path";

export class phpgen extends generator {
  base: string | undefined;

  constructor(file: string) {
    super(file);
    this.base = path.basename(file);
  }

  override async getImage() {
    return "php:" + await this.getPhpVersion();
  }

  override getPreRun() {
    return [
        ["/bin/bash", "-c", "apt-get update && apt-get upgrade && apt-get install -y openssl zip unzip git"],
        ["/bin/bash", "-c", "curl -sS https://getcomposer.org/installer -o /tmp/composer-setup.php"],
        ["/bin/bash", "-c", "php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer"]
    ];
  }

  override getExpose() {
    return 1234
  }

  override getPostRun() {
    return [
      ["/bin/bash", "-c", "composer install"]
    ];
  }

  override getEnv() {
    return {
      "PATH": "/usr/local/bin:$PATH",
    };
  }

  override getCopy() {
    const fileName: string = path.basename(this.file);
    return [{ [fileName]: this.file },{'composer.json': path.join(path.dirname(this.file), "composer.json")}];
}

  // Command to run the PHP built-in server on localhost at port 1234
  override getCmd() {
    return [
      "php",
      "-S",
      "0.0.0.0:1234",
      this.base
    ];
  }

  // Function to detect PHP version requirements based on code content
  async getPhpVersion() {
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(this.file);
    const code = decoder.decode(data);

    const versionRules = [
      { regex: /declare\(strict_types=1\)/, version: "7.0" },
      { regex: /function\s+\w+\s*\(.*\)\s*:\s*void/, version: "7.1" },
      { regex: /function\s+\w+\s*\(.*\)\s*:\s*array/, version: "7.0" },
      { regex: /public\s+const/, version: "7.1" },
      { regex: /\?\?>/, version: "5.4" },
      { regex: /array_key_first|array_key_last/, version: "7.3" },
      { regex: /match\s*\(.*\)/, version: "8.0" },
    ];

    let maxVersion = "8.3";
    for (const rule of versionRules) {
      if (rule.regex.test(code)) {
        maxVersion = this.compareVersions(maxVersion, rule.version);
      }
    }

    return maxVersion;
  }

  private compareVersions(version1: string, version2: string): string {
    const [major1, minor1] = version1.split(".").map(Number);
    const [major2, minor2] = version2.split(".").map(Number);

    if (major2 > major1 || (major2 === major1 && minor2 > minor1)) {
      return version2;
    }
    return version1;
  }

  
  async detectPackages() {
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(this.file);
    const code = decoder.decode(data);
  
    // Match all `use` statements
    const useStatements = code.match(/use\s+([a-zA-Z0-9_\\]+);/g) || [];
    const packages = new Set<{ packageKey: string, searchKey: string }>();
  
    for (const statement of useStatements) {
      const namespaceParts = statement.replace(/^use\s+|;$/g, "").split("\\");
  
      // Only consider use statements with more than one part
      if (namespaceParts.length > 1) {
        // First part is for `require` key
        const packageKey = namespaceParts[0].toLowerCase();
  
        // First two parts combined for `search` key
        const searchKey = `${namespaceParts[0].toLowerCase()}/${namespaceParts[1].toLowerCase()}`;
  
        packages.add({ packageKey, searchKey });
      }
    }
  
    // Return an array of unique packages, each with packageKey and searchKey
    return Array.from(packages);
  }

  async searchForPackages(packages: { packageKey: string; searchKey: string; }[]) {
    const apiUrl = "https://packagist.org/search.json?q=";
    const packageResults: Record<string, string> = {}; // Store the best matching results
  
    for (const pkg of packages) {
      try {
        const response = await fetch(`${apiUrl}${pkg.searchKey}`);
        if (!response.ok) {
          console.error(`Failed to fetch package information for ${pkg}`);
          packageResults[pkg.packageKey] = `${pkg.packageKey}/${pkg.packageKey}`; // Fallback option
          continue;
        }
  
        const data = await response.json();
        if (data.results.length > 0) {
          // Use the first search result
          packageResults[pkg.packageKey] = data.results[0].name;
          console.log(`Results for package: ${pkg}`);
          console.log(`Using: ${data.results[0].name}`);
          console.log(`Description: ${data.results[0].description}`);
          console.log(`URL: ${data.results[0].url}`);
          console.log("------------------------------");
        } else {
          console.log(`No results found for package: ${pkg}`);
          packageResults[pkg.packageKey] = `${pkg.packageKey}/${pkg.packageKey}`; // Fallback option
        }
      } catch (error) {
        console.error(`Error fetching package information for ${pkg}:`, error);
        packageResults[pkg.packageKey] = `${pkg}/${pkg}`; // Fallback option
      }
    }
  
    return packageResults;
  }
  
  async generateComposerJson() {
    const detectedPackages = await this.detectPackages();
    const packageResults = await this.searchForPackages(detectedPackages); // Search for packages using Packagist API
  
    const composerJson: any = {
      "require": {},
      "autoload": {
        "psr-4": {
          "App\\": "src/"
        }
      }
    };
  
    for (const pkg of detectedPackages) {
      composerJson.require[packageResults[pkg.packageKey]] = "*"; // Use the best match or fallback
    }
  
    await Deno.writeTextFile(
      path.join(path.dirname(this.file), "composer.json"),
      JSON.stringify(composerJson, null, 2)
    );
  
    return composerJson;
  }

  async insertRequireAutoload() {
    const filePath = this.file;
    const fileName = path.basename(this.file);
    const autoloadCode = `require __DIR__ . '/vendor/autoload.php';`;
  
    const data = await Deno.readTextFile(filePath);
    
    // Check if the PHP opening tag exists
    const openingTagIndex = data.indexOf("<?php");
    if (openingTagIndex !== -1) {
      // Check if the require statement already exists
      if (data.includes(autoloadCode)) {
        console.log(`Autoload require statement already exists in ${fileName}`);
        return; // No need to insert if it already exists
      }
  
      // Add the autoload require statement just after the PHP opening tag
      const modifiedData = data.slice(0, openingTagIndex + 5) + "\n" + autoloadCode + "\n" + data.slice(openingTagIndex + 5);
      
      // Write the changes back to the file
      await Deno.writeTextFile(filePath, modifiedData);
      console.log(`Added autoload require statement to ${fileName}`);
    } else {
      console.error("PHP opening tag '<?php' not found in the file.");
    }
  }

}

