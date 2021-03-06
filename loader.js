/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  const singleRequire = async name => {
    if (!registry[name]) {
      // #ifdef useEval
      const code = await fetch(name).then(resp => resp.text());
      eval(code);
      // #else
      await new Promise(async resolve => {
        if ("document" in self) {
          const script = document.createElement("script");
          // #ifdef publicPath
          script.src = // #put "'" + publicPath + "' + name.slice(1);"
            // #else
            script.src = name;
          // #endif
          // Ya never know
          script.defer = true;
          document.head.appendChild(script);
          script.onload = resolve;
        } else {
          importScripts(name);
          resolve();
        }
      });
      // #endif

      if (!registry[name]) {
        throw new Error(`Module ${name} didn’t register its module`);
      }
    }
    return registry[name];
  };

  const require = async (names, resolve) => {
    const modules = await Promise.all(names.map(singleRequire));
    resolve(modules.length === 1 ? modules[0] : modules);
  };

  const registry = {
    require: Promise.resolve(require)
  };

  self.define = (moduleName, depsNames, factory) => {
    if (registry[moduleName]) {
      // Module is already loading or loaded.
      return;
    }
    registry[moduleName] = new Promise(async resolve => {
      let exports = {};
      const module = {
        // #ifdef publicPath
        uri: location.origin + // #put "'" + publicPath + "' + moduleName.slice(1)"
        // #else
        uri: location.origin + moduleName.slice(1)
        // #endif
      };
      const deps = await Promise.all(
        depsNames.map(depName => {
          if (depName === "exports") {
            return exports;
          }
          if (depName === "module") {
            return module;
          }
          return singleRequire(depName);
        })
      );
      exports.default = factory(...deps);
      resolve(exports);
    });
  };
}
