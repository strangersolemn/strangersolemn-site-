# The engine, for coders

The fifteen gl1tches come from one inscription, **GL1TCH ENG1NE**. It is CC0, 9.6 KB, one file, no libraries. You can use it in your own pieces without the CC0mposer.

```
691e244829aceaf438ed9304cf13f5874462c90865524b3f7c8662ad5414fbd1i0
```

## Use it

Put it in an iframe and set options after `#`:

```
<iframe src="/content/691e244829aceaf438ed9304cf13f5874462c90865524b3f7c8662ad5414fbd1i0#m=3&c=ff3600&x=.4"></iframe>
```

## Options

| Key | Meaning | Values |
|---|---|---|
| `m` | Mode | 0 bars, 1 snow, 2 pulse, 3 dash, 4 mosh, 5 xor, 6 sort, 7 vhs, 8 lines, 9 bits, 10 quad, 11 maze, 12 moire, 13 dots, 14 burst |
| `c` | Main colour | hex, like `ff3600` |
| `e` | Second colour | hex |
| `b` | Background | hex, or `none` for see-through |
| `v` | Speed | 0 to 4 |
| `d` | Density | 0 to 1 |
| `z` | Pixel size | 0 to 4 |
| `x` | RGB split | 0 to 1 |
| `l` | Scanlines | 0 to 1 |
| `j` | Tear | 0 to 1 |
| `s` | Seed | a number. Same seed, same gl1tch |
| `a` | Auto | seconds between automatic mode changes |
| `g` | Grid | `g=1` shows all fifteen at once |

## Good to know

* It drops its graphics context while it is off screen, so one piece can carry many of these and show one at a time.
* Its noise is read from the bytes of the OCM Dimensions launcher (three.js on Bitcoin, inscription 203,112). The library is never run, only read. If it can't be loaded, the noise falls back to maths and the gl1tch still draws.
* It is a child of the CC0mposer's parent inscription, so it sits in the same family on chain.
