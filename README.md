# v2ray-handle

## Usage

```js

import { v2ray } from "v2ray-handle";
import v2rayConfig from "/etc/v2ray/config";

(async () => {
  const subprocess = await v2ray(v2rayConfig);
  // use proxy somehow
})().catch((err) => console.error(err));
