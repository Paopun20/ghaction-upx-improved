[![GitHub release](https://img.shields.io/github/release/crazy-max/ghaction-upx.svg?style=flat-square)](https://github.com/crazy-max/ghaction-upx/releases/latest)
[![GitHub marketplace](https://img.shields.io/badge/marketplace-upx--github--action-blue?logo=github&style=flat-square)](https://github.com/marketplace/actions/upx-github-action)
[![Test workflow](https://img.shields.io/github/actions/workflow/status/crazy-max/ghaction-upx/test.yml?branch=master&label=test&logo=github&style=flat-square)](https://github.com/crazy-max/ghaction-upx/actions?workflow=test)
[![Codecov](https://img.shields.io/codecov/c/github/crazy-max/ghaction-upx?logo=codecov&style=flat-square)](https://codecov.io/gh/crazy-max/ghaction-upx)
[![Become a sponsor](https://img.shields.io/badge/sponsor-crazy--max-181717.svg?logo=github&style=flat-square)](https://github.com/sponsors/crazy-max)
[![Paypal Donate](https://img.shields.io/badge/donate-paypal-00457c.svg?logo=paypal&style=flat-square)](https://www.paypal.me/crazyws)

## About

GitHub Action for [UPX](https://github.com/upx/upx), the Ultimate Packer for eXecutables.

![Screenshot](.github/ghaction-upx.png)

## Note

This action is a fork of [crazy-max/ghaction-upx](https://github.com/crazy-max/ghaction-upx) with some improvements and fixes :3

---

- [Usage](#usage)
- [Customizing](#customizing)
  - [inputs](#inputs)
- [Contributing](#contributing)
- [License](#license)

## Usage

```yaml
name: upx

on:
  push:

jobs:
  upx:
    runs-on: ubuntu-latest
    steps:
      - name: Run UPX
        uses: paopun20/ghaction-upx-improved@master
        with:
          version: latest
          files: |
            ./bin/*.exe
          args: -fq
```

If you just want to install UPX:

```yaml
name: upx

on:
  push:

jobs:
  upx:
    runs-on: ubuntu-latest
    steps:
      - name: Install UPX
        uses: paopun20/ghaction-upx-improved@master
        with:
          install-only: true
      - name: UPX version
        run: upx --version
```

## Customizing

### Inputs

The following inputs can be used as `step.with` keys

| Name           | Default  | Description                                                |
| -------------- | -------- | ---------------------------------------------------------- |
| `version`      | `latest` | UPX version. Example: `v3.95`                              |
| `files`        |          | Newline-delimited list of path globs for files to compress |
| `args`         |          | Arguments to pass to UPX                                   |
| `install-only` | `false`  | Just install UPX                                           |

## Contributing

Want to contribute? Awesome! The most basic way to show your support is to star
the project, or to raise issues. You can also support this project by [**becoming a sponsor on GitHub**](https://github.com/sponsors/crazy-max)
or by making a [PayPal donation](https://www.paypal.me/crazyws) to ensure this
journey continues indefinitely!

Thanks again for your support, it is much appreciated! :pray:

## License

MIT. See `LICENSE` for more details.
