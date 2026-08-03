/** Host effect boundary for realtime media codecs and call-audio processing. */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
export type MediaCodecKind = "vp8" | "vp9" | "h264" | "opus" | "pcm" | "jpeg";
export type MediaSampleKind = "video" | "audio";
export interface MediaCodecConfiguration {
  readonly codec: MediaCodecKind;
  readonly sampleKind: MediaSampleKind;
  readonly bitrateBps: number;
  readonly sampleRate?: number;
  readonly channels?: number;
  readonly width?: number;
  readonly height?: number;
  readonly frameRate?: number;
  readonly voiceDuplex?: boolean;
}
export interface RawMediaSample {
  readonly captureAtUs: number;
  readonly bytes: Uint8Array;
  readonly keyFrame?: boolean;
}
export interface EncodedMediaSample extends RawMediaSample {
  readonly codec: MediaCodecKind;
}
export interface MediaCodecDriver {
  readonly implementation: "webcodecs" | "videotoolbox" | "mediacodec" | "bundled-opus" | "simulated";
  supports(configuration: MediaCodecConfiguration): boolean;
  encode(configuration: MediaCodecConfiguration, sample: RawMediaSample): Promise<EncodedMediaSample>;
  decode(configuration: MediaCodecConfiguration, sample: EncodedMediaSample): Promise<RawMediaSample>;
  close(): Promise<void>;
}

/** Browser/desktop WebCodecs audio implementation. Video needs frame-layout metadata. */
export class WebCodecsMediaCodecDriver implements MediaCodecDriver {
  readonly implementation = "webcodecs" as const;
  private closed = stryMutAct_9fa48("1688") ? true : (stryCov_9fa48("1688"), false);
  supports(configuration: MediaCodecConfiguration): boolean {
    if (stryMutAct_9fa48("1689")) {
      {}
    } else {
      stryCov_9fa48("1689");
      if (stryMutAct_9fa48("1692") ? this.closed && configuration.sampleKind !== "audio" : stryMutAct_9fa48("1691") ? false : stryMutAct_9fa48("1690") ? true : (stryCov_9fa48("1690", "1691", "1692"), this.closed || (stryMutAct_9fa48("1694") ? configuration.sampleKind === "audio" : stryMutAct_9fa48("1693") ? false : (stryCov_9fa48("1693", "1694"), configuration.sampleKind !== (stryMutAct_9fa48("1695") ? "" : (stryCov_9fa48("1695"), "audio")))))) return stryMutAct_9fa48("1696") ? true : (stryCov_9fa48("1696"), false);
      if (stryMutAct_9fa48("1699") ? configuration.codec !== "pcm" : stryMutAct_9fa48("1698") ? false : stryMutAct_9fa48("1697") ? true : (stryCov_9fa48("1697", "1698", "1699"), configuration.codec === (stryMutAct_9fa48("1700") ? "" : (stryCov_9fa48("1700"), "pcm")))) return stryMutAct_9fa48("1701") ? false : (stryCov_9fa48("1701"), true);
      const globals = globalThis as Record<string, unknown>;
      return stryMutAct_9fa48("1704") ? configuration.codec === "opus" && typeof globals.AudioEncoder === "function" && typeof globals.AudioDecoder === "function" && typeof globals.AudioData === "function" || typeof globals.EncodedAudioChunk === "function" : stryMutAct_9fa48("1703") ? false : stryMutAct_9fa48("1702") ? true : (stryCov_9fa48("1702", "1703", "1704"), (stryMutAct_9fa48("1706") ? configuration.codec === "opus" && typeof globals.AudioEncoder === "function" && typeof globals.AudioDecoder === "function" || typeof globals.AudioData === "function" : stryMutAct_9fa48("1705") ? true : (stryCov_9fa48("1705", "1706"), (stryMutAct_9fa48("1708") ? configuration.codec === "opus" && typeof globals.AudioEncoder === "function" || typeof globals.AudioDecoder === "function" : stryMutAct_9fa48("1707") ? true : (stryCov_9fa48("1707", "1708"), (stryMutAct_9fa48("1710") ? configuration.codec === "opus" || typeof globals.AudioEncoder === "function" : stryMutAct_9fa48("1709") ? true : (stryCov_9fa48("1709", "1710"), (stryMutAct_9fa48("1712") ? configuration.codec !== "opus" : stryMutAct_9fa48("1711") ? true : (stryCov_9fa48("1711", "1712"), configuration.codec === (stryMutAct_9fa48("1713") ? "" : (stryCov_9fa48("1713"), "opus")))) && (stryMutAct_9fa48("1715") ? typeof globals.AudioEncoder !== "function" : stryMutAct_9fa48("1714") ? true : (stryCov_9fa48("1714", "1715"), typeof globals.AudioEncoder === (stryMutAct_9fa48("1716") ? "" : (stryCov_9fa48("1716"), "function")))))) && (stryMutAct_9fa48("1718") ? typeof globals.AudioDecoder !== "function" : stryMutAct_9fa48("1717") ? true : (stryCov_9fa48("1717", "1718"), typeof globals.AudioDecoder === (stryMutAct_9fa48("1719") ? "" : (stryCov_9fa48("1719"), "function")))))) && (stryMutAct_9fa48("1721") ? typeof globals.AudioData !== "function" : stryMutAct_9fa48("1720") ? true : (stryCov_9fa48("1720", "1721"), typeof globals.AudioData === (stryMutAct_9fa48("1722") ? "" : (stryCov_9fa48("1722"), "function")))))) && (stryMutAct_9fa48("1724") ? typeof globals.EncodedAudioChunk !== "function" : stryMutAct_9fa48("1723") ? true : (stryCov_9fa48("1723", "1724"), typeof globals.EncodedAudioChunk === (stryMutAct_9fa48("1725") ? "" : (stryCov_9fa48("1725"), "function")))));
    }
  }
  async encode(configuration: MediaCodecConfiguration, sample: RawMediaSample): Promise<EncodedMediaSample> {
    if (stryMutAct_9fa48("1726")) {
      {}
    } else {
      stryCov_9fa48("1726");
      this.assertSupported(configuration);
      if (stryMutAct_9fa48("1729") ? configuration.codec !== "pcm" : stryMutAct_9fa48("1728") ? false : stryMutAct_9fa48("1727") ? true : (stryCov_9fa48("1727", "1728", "1729"), configuration.codec === (stryMutAct_9fa48("1730") ? "" : (stryCov_9fa48("1730"), "pcm")))) return stryMutAct_9fa48("1731") ? {} : (stryCov_9fa48("1731"), {
        ...sample,
        bytes: stryMutAct_9fa48("1732") ? sample.bytes : (stryCov_9fa48("1732"), sample.bytes.slice()),
        codec: stryMutAct_9fa48("1733") ? "" : (stryCov_9fa48("1733"), "pcm")
      });
      const globals = globalThis as Record<string, any>;
      const sampleRate = stryMutAct_9fa48("1734") ? configuration.sampleRate && 16_000 : (stryCov_9fa48("1734"), configuration.sampleRate ?? 16_000);
      const channels = stryMutAct_9fa48("1735") ? configuration.channels && 1 : (stryCov_9fa48("1735"), configuration.channels ?? 1);
      if (stryMutAct_9fa48("1738") ? sample.bytes.byteLength % (4 * channels) === 0 : stryMutAct_9fa48("1737") ? false : stryMutAct_9fa48("1736") ? true : (stryCov_9fa48("1736", "1737", "1738"), (stryMutAct_9fa48("1739") ? sample.bytes.byteLength * (4 * channels) : (stryCov_9fa48("1739"), sample.bytes.byteLength % (stryMutAct_9fa48("1740") ? 4 / channels : (stryCov_9fa48("1740"), 4 * channels)))) !== 0)) throw new Error(stryMutAct_9fa48("1741") ? "" : (stryCov_9fa48("1741"), "PCM input must contain interleaved float32 samples."));
      return new Promise((resolve, reject) => {
        if (stryMutAct_9fa48("1742")) {
          {}
        } else {
          stryCov_9fa48("1742");
          let settled = stryMutAct_9fa48("1743") ? true : (stryCov_9fa48("1743"), false);
          const settle = (fn: () => void) => {
            if (stryMutAct_9fa48("1744")) {
              {}
            } else {
              stryCov_9fa48("1744");
              if (stryMutAct_9fa48("1746") ? false : stryMutAct_9fa48("1745") ? true : (stryCov_9fa48("1745", "1746"), settled)) return;
              settled = stryMutAct_9fa48("1747") ? false : (stryCov_9fa48("1747"), true);
              fn();
            }
          };
          const encoder = new globals.AudioEncoder(stryMutAct_9fa48("1748") ? {} : (stryCov_9fa48("1748"), {
            output(chunk: any) {
              if (stryMutAct_9fa48("1749")) {
                {}
              } else {
                stryCov_9fa48("1749");
                const bytes = new Uint8Array(chunk.byteLength);
                chunk.copyTo(bytes);
                settle(stryMutAct_9fa48("1750") ? () => undefined : (stryCov_9fa48("1750"), () => resolve(stryMutAct_9fa48("1751") ? {} : (stryCov_9fa48("1751"), {
                  captureAtUs: sample.captureAtUs,
                  bytes,
                  codec: stryMutAct_9fa48("1752") ? "" : (stryCov_9fa48("1752"), "opus")
                }))));
              }
            },
            error(error: unknown) {
              if (stryMutAct_9fa48("1753")) {
                {}
              } else {
                stryCov_9fa48("1753");
                settle(stryMutAct_9fa48("1754") ? () => undefined : (stryCov_9fa48("1754"), () => reject(error instanceof Error ? error : new Error(String(error)))));
              }
            }
          }));
          try {
            if (stryMutAct_9fa48("1755")) {
              {}
            } else {
              stryCov_9fa48("1755");
              encoder.configure(stryMutAct_9fa48("1756") ? {} : (stryCov_9fa48("1756"), {
                codec: stryMutAct_9fa48("1757") ? "" : (stryCov_9fa48("1757"), "opus"),
                sampleRate,
                numberOfChannels: channels,
                bitrate: configuration.bitrateBps
              }));
              const copy = stryMutAct_9fa48("1758") ? sample.bytes : (stryCov_9fa48("1758"), sample.bytes.slice());
              const audio = new globals.AudioData(stryMutAct_9fa48("1759") ? {} : (stryCov_9fa48("1759"), {
                format: stryMutAct_9fa48("1760") ? "" : (stryCov_9fa48("1760"), "f32"),
                sampleRate,
                numberOfFrames: stryMutAct_9fa48("1761") ? copy.byteLength * (4 * channels) : (stryCov_9fa48("1761"), copy.byteLength / (stryMutAct_9fa48("1762") ? 4 / channels : (stryCov_9fa48("1762"), 4 * channels))),
                numberOfChannels: channels,
                timestamp: sample.captureAtUs,
                data: copy.buffer
              }));
              encoder.encode(audio);
              audio.close();
              void encoder.flush().finally(() => {
                if (stryMutAct_9fa48("1763")) {
                  {}
                } else {
                  stryCov_9fa48("1763");
                  try {
                    if (stryMutAct_9fa48("1764")) {
                      {}
                    } else {
                      stryCov_9fa48("1764");
                      encoder.close();
                    }
                  } catch {
                    /* already closed */
                  }
                }
              });
            }
          } catch (error) {
            if (stryMutAct_9fa48("1765")) {
              {}
            } else {
              stryCov_9fa48("1765");
              try {
                if (stryMutAct_9fa48("1766")) {
                  {}
                } else {
                  stryCov_9fa48("1766");
                  encoder.close();
                }
              } catch {
                /* already closed */
              }
              settle(stryMutAct_9fa48("1767") ? () => undefined : (stryCov_9fa48("1767"), () => reject(error)));
            }
          }
        }
      });
    }
  }
  async decode(configuration: MediaCodecConfiguration, sample: EncodedMediaSample): Promise<RawMediaSample> {
    if (stryMutAct_9fa48("1768")) {
      {}
    } else {
      stryCov_9fa48("1768");
      this.assertSupported(configuration);
      if (stryMutAct_9fa48("1771") ? configuration.codec !== "pcm" : stryMutAct_9fa48("1770") ? false : stryMutAct_9fa48("1769") ? true : (stryCov_9fa48("1769", "1770", "1771"), configuration.codec === (stryMutAct_9fa48("1772") ? "" : (stryCov_9fa48("1772"), "pcm")))) return stryMutAct_9fa48("1773") ? {} : (stryCov_9fa48("1773"), {
        captureAtUs: sample.captureAtUs,
        bytes: stryMutAct_9fa48("1774") ? sample.bytes : (stryCov_9fa48("1774"), sample.bytes.slice())
      });
      if (stryMutAct_9fa48("1777") ? sample.codec === "opus" : stryMutAct_9fa48("1776") ? false : stryMutAct_9fa48("1775") ? true : (stryCov_9fa48("1775", "1776", "1777"), sample.codec !== (stryMutAct_9fa48("1778") ? "" : (stryCov_9fa48("1778"), "opus")))) throw new Error(stryMutAct_9fa48("1779") ? "" : (stryCov_9fa48("1779"), "Encoded media codec does not match configuration."));
      const globals = globalThis as Record<string, any>;
      const sampleRate = stryMutAct_9fa48("1780") ? configuration.sampleRate && 16_000 : (stryCov_9fa48("1780"), configuration.sampleRate ?? 16_000);
      const channels = stryMutAct_9fa48("1781") ? configuration.channels && 1 : (stryCov_9fa48("1781"), configuration.channels ?? 1);
      return new Promise((resolve, reject) => {
        if (stryMutAct_9fa48("1782")) {
          {}
        } else {
          stryCov_9fa48("1782");
          let settled = stryMutAct_9fa48("1783") ? true : (stryCov_9fa48("1783"), false);
          const settle = (fn: () => void) => {
            if (stryMutAct_9fa48("1784")) {
              {}
            } else {
              stryCov_9fa48("1784");
              if (stryMutAct_9fa48("1786") ? false : stryMutAct_9fa48("1785") ? true : (stryCov_9fa48("1785", "1786"), settled)) return;
              settled = stryMutAct_9fa48("1787") ? false : (stryCov_9fa48("1787"), true);
              fn();
            }
          };
          const decoder = new globals.AudioDecoder(stryMutAct_9fa48("1788") ? {} : (stryCov_9fa48("1788"), {
            output(audio: any) {
              if (stryMutAct_9fa48("1789")) {
                {}
              } else {
                stryCov_9fa48("1789");
                const bytes = new Uint8Array(audio.allocationSize(stryMutAct_9fa48("1790") ? {} : (stryCov_9fa48("1790"), {
                  planeIndex: 0
                })));
                audio.copyTo(bytes, stryMutAct_9fa48("1791") ? {} : (stryCov_9fa48("1791"), {
                  planeIndex: 0,
                  format: stryMutAct_9fa48("1792") ? "" : (stryCov_9fa48("1792"), "f32")
                }));
                audio.close();
                settle(stryMutAct_9fa48("1793") ? () => undefined : (stryCov_9fa48("1793"), () => resolve(stryMutAct_9fa48("1794") ? {} : (stryCov_9fa48("1794"), {
                  captureAtUs: sample.captureAtUs,
                  bytes
                }))));
              }
            },
            error(error: unknown) {
              if (stryMutAct_9fa48("1795")) {
                {}
              } else {
                stryCov_9fa48("1795");
                settle(stryMutAct_9fa48("1796") ? () => undefined : (stryCov_9fa48("1796"), () => reject(error instanceof Error ? error : new Error(String(error)))));
              }
            }
          }));
          try {
            if (stryMutAct_9fa48("1797")) {
              {}
            } else {
              stryCov_9fa48("1797");
              decoder.configure(stryMutAct_9fa48("1798") ? {} : (stryCov_9fa48("1798"), {
                codec: stryMutAct_9fa48("1799") ? "" : (stryCov_9fa48("1799"), "opus"),
                sampleRate,
                numberOfChannels: channels
              }));
              decoder.decode(new globals.EncodedAudioChunk(stryMutAct_9fa48("1800") ? {} : (stryCov_9fa48("1800"), {
                type: stryMutAct_9fa48("1801") ? "" : (stryCov_9fa48("1801"), "key"),
                timestamp: sample.captureAtUs,
                data: sample.bytes
              })));
              void decoder.flush().finally(() => {
                if (stryMutAct_9fa48("1802")) {
                  {}
                } else {
                  stryCov_9fa48("1802");
                  try {
                    if (stryMutAct_9fa48("1803")) {
                      {}
                    } else {
                      stryCov_9fa48("1803");
                      decoder.close();
                    }
                  } catch {
                    /* already closed */
                  }
                }
              });
            }
          } catch (error) {
            if (stryMutAct_9fa48("1804")) {
              {}
            } else {
              stryCov_9fa48("1804");
              try {
                if (stryMutAct_9fa48("1805")) {
                  {}
                } else {
                  stryCov_9fa48("1805");
                  decoder.close();
                }
              } catch {
                /* already closed */
              }
              settle(stryMutAct_9fa48("1806") ? () => undefined : (stryCov_9fa48("1806"), () => reject(error)));
            }
          }
        }
      });
    }
  }
  async close(): Promise<void> {
    if (stryMutAct_9fa48("1807")) {
      {}
    } else {
      stryCov_9fa48("1807");
      this.closed = stryMutAct_9fa48("1808") ? false : (stryCov_9fa48("1808"), true);
    }
  }
  private assertSupported(configuration: MediaCodecConfiguration): void {
    if (stryMutAct_9fa48("1809")) {
      {}
    } else {
      stryCov_9fa48("1809");
      if (stryMutAct_9fa48("1812") ? false : stryMutAct_9fa48("1811") ? true : stryMutAct_9fa48("1810") ? this.supports(configuration) : (stryCov_9fa48("1810", "1811", "1812"), !this.supports(configuration))) throw new Error(stryMutAct_9fa48("1813") ? "" : (stryCov_9fa48("1813"), "WebCodecs audio configuration is unsupported or closed."));
    }
  }
}

/** Deterministic codec boundary implementation for simulation and conformance tapes. */
export class SimulatedMediaCodecDriver implements MediaCodecDriver {
  readonly implementation = "simulated" as const;
  private closed = stryMutAct_9fa48("1814") ? true : (stryCov_9fa48("1814"), false);
  supports(configuration: MediaCodecConfiguration): boolean {
    if (stryMutAct_9fa48("1815")) {
      {}
    } else {
      stryCov_9fa48("1815");
      return stryMutAct_9fa48("1818") ? !this.closed || configuration.sampleKind === "audio" && ["opus", "pcm"].includes(configuration.codec) || configuration.sampleKind === "video" && ["vp8", "vp9", "h264", "jpeg"].includes(configuration.codec) : stryMutAct_9fa48("1817") ? false : stryMutAct_9fa48("1816") ? true : (stryCov_9fa48("1816", "1817", "1818"), (stryMutAct_9fa48("1819") ? this.closed : (stryCov_9fa48("1819"), !this.closed)) && (stryMutAct_9fa48("1821") ? configuration.sampleKind === "audio" && ["opus", "pcm"].includes(configuration.codec) && configuration.sampleKind === "video" && ["vp8", "vp9", "h264", "jpeg"].includes(configuration.codec) : stryMutAct_9fa48("1820") ? true : (stryCov_9fa48("1820", "1821"), (stryMutAct_9fa48("1823") ? configuration.sampleKind === "audio" || ["opus", "pcm"].includes(configuration.codec) : stryMutAct_9fa48("1822") ? false : (stryCov_9fa48("1822", "1823"), (stryMutAct_9fa48("1825") ? configuration.sampleKind !== "audio" : stryMutAct_9fa48("1824") ? true : (stryCov_9fa48("1824", "1825"), configuration.sampleKind === (stryMutAct_9fa48("1826") ? "" : (stryCov_9fa48("1826"), "audio")))) && (stryMutAct_9fa48("1827") ? [] : (stryCov_9fa48("1827"), [stryMutAct_9fa48("1828") ? "" : (stryCov_9fa48("1828"), "opus"), stryMutAct_9fa48("1829") ? "" : (stryCov_9fa48("1829"), "pcm")])).includes(configuration.codec))) || (stryMutAct_9fa48("1831") ? configuration.sampleKind === "video" || ["vp8", "vp9", "h264", "jpeg"].includes(configuration.codec) : stryMutAct_9fa48("1830") ? false : (stryCov_9fa48("1830", "1831"), (stryMutAct_9fa48("1833") ? configuration.sampleKind !== "video" : stryMutAct_9fa48("1832") ? true : (stryCov_9fa48("1832", "1833"), configuration.sampleKind === (stryMutAct_9fa48("1834") ? "" : (stryCov_9fa48("1834"), "video")))) && (stryMutAct_9fa48("1835") ? [] : (stryCov_9fa48("1835"), [stryMutAct_9fa48("1836") ? "" : (stryCov_9fa48("1836"), "vp8"), stryMutAct_9fa48("1837") ? "" : (stryCov_9fa48("1837"), "vp9"), stryMutAct_9fa48("1838") ? "" : (stryCov_9fa48("1838"), "h264"), stryMutAct_9fa48("1839") ? "" : (stryCov_9fa48("1839"), "jpeg")])).includes(configuration.codec))))));
    }
  }
  async encode(configuration: MediaCodecConfiguration, sample: RawMediaSample): Promise<EncodedMediaSample> {
    if (stryMutAct_9fa48("1840")) {
      {}
    } else {
      stryCov_9fa48("1840");
      this.assertSupported(configuration);
      return stryMutAct_9fa48("1841") ? {} : (stryCov_9fa48("1841"), {
        ...sample,
        bytes: stryMutAct_9fa48("1842") ? sample.bytes : (stryCov_9fa48("1842"), sample.bytes.slice()),
        codec: configuration.codec
      });
    }
  }
  async decode(configuration: MediaCodecConfiguration, sample: EncodedMediaSample): Promise<RawMediaSample> {
    if (stryMutAct_9fa48("1843")) {
      {}
    } else {
      stryCov_9fa48("1843");
      this.assertSupported(configuration);
      if (stryMutAct_9fa48("1846") ? sample.codec === configuration.codec : stryMutAct_9fa48("1845") ? false : stryMutAct_9fa48("1844") ? true : (stryCov_9fa48("1844", "1845", "1846"), sample.codec !== configuration.codec)) throw new Error(stryMutAct_9fa48("1847") ? "" : (stryCov_9fa48("1847"), "Encoded media codec does not match configuration."));
      const {
        codec: _codec,
        ...raw
      } = sample;
      return stryMutAct_9fa48("1848") ? {} : (stryCov_9fa48("1848"), {
        ...raw,
        bytes: stryMutAct_9fa48("1849") ? raw.bytes : (stryCov_9fa48("1849"), raw.bytes.slice())
      });
    }
  }
  async close(): Promise<void> {
    if (stryMutAct_9fa48("1850")) {
      {}
    } else {
      stryCov_9fa48("1850");
      this.closed = stryMutAct_9fa48("1851") ? false : (stryCov_9fa48("1851"), true);
    }
  }
  private assertSupported(configuration: MediaCodecConfiguration): void {
    if (stryMutAct_9fa48("1852")) {
      {}
    } else {
      stryCov_9fa48("1852");
      if (stryMutAct_9fa48("1855") ? false : stryMutAct_9fa48("1854") ? true : stryMutAct_9fa48("1853") ? this.supports(configuration) : (stryCov_9fa48("1853", "1854", "1855"), !this.supports(configuration))) throw new Error(stryMutAct_9fa48("1856") ? "" : (stryCov_9fa48("1856"), "Media codec configuration is unsupported or closed."));
    }
  }
}
type OpusScriptInstance = {
  encode(buffer: Uint8Array, frameSize: number): Uint8Array;
  decode(buffer: Uint8Array): Uint8Array;
  setBitrate(bitrate: number): void;
  delete(): void;
};
type OpusScriptCtor = {
  new (samplingRate: number, channels?: number, application?: number, options?: {
    wasm?: boolean;
  }): OpusScriptInstance;
  Application: {
    VOIP: number;
    AUDIO: number;
    RESTRICTED_LOWDELAY: number;
  };
};
let opusScriptCtor: OpusScriptCtor | null | undefined;
let opusScriptLoader: (() => OpusScriptCtor | null) | null = null;

/** Hosts that can `require("opusscript")` register a loader before first use. */
export function configureBundledOpusLoader(loader: () => OpusScriptCtor | null): void {
  if (stryMutAct_9fa48("1857")) {
    {}
  } else {
    stryCov_9fa48("1857");
    opusScriptLoader = loader;
    opusScriptCtor = undefined;
  }
}
function loadOpusScript(): OpusScriptCtor | null {
  if (stryMutAct_9fa48("1858")) {
    {}
  } else {
    stryCov_9fa48("1858");
    if (stryMutAct_9fa48("1861") ? opusScriptCtor === undefined : stryMutAct_9fa48("1860") ? false : stryMutAct_9fa48("1859") ? true : (stryCov_9fa48("1859", "1860", "1861"), opusScriptCtor !== undefined)) return opusScriptCtor;
    if (stryMutAct_9fa48("1864") ? opusScriptLoader === null : stryMutAct_9fa48("1863") ? false : stryMutAct_9fa48("1862") ? true : (stryCov_9fa48("1862", "1863", "1864"), opusScriptLoader !== null)) {
      if (stryMutAct_9fa48("1865")) {
        {}
      } else {
        stryCov_9fa48("1865");
        try {
          if (stryMutAct_9fa48("1866")) {
            {}
          } else {
            stryCov_9fa48("1866");
            opusScriptCtor = opusScriptLoader();
          }
        } catch {
          if (stryMutAct_9fa48("1867")) {
            {}
          } else {
            stryCov_9fa48("1867");
            opusScriptCtor = null;
          }
        }
        return opusScriptCtor;
      }
    }
    try {
      if (stryMutAct_9fa48("1868")) {
        {}
      } else {
        stryCov_9fa48("1868");
        const createRequire = (Function('return typeof require === "function" ? require("module").createRequire : null') as () => ((filename: string) => (id: string) => OpusScriptCtor) | null)();
        if (stryMutAct_9fa48("1871") ? createRequire !== null : stryMutAct_9fa48("1870") ? false : stryMutAct_9fa48("1869") ? true : (stryCov_9fa48("1869", "1870", "1871"), createRequire === null)) {
          if (stryMutAct_9fa48("1872")) {
            {}
          } else {
            stryCov_9fa48("1872");
            opusScriptCtor = null;
            return null;
          }
        }
        const cwd = (Function('return typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : "/"') as () => string)();
        opusScriptCtor = createRequire(stryMutAct_9fa48("1873") ? `` : (stryCov_9fa48("1873"), `${cwd}/packages/effects/package.json`))(stryMutAct_9fa48("1874") ? "" : (stryCov_9fa48("1874"), "opusscript"));
        return opusScriptCtor;
      }
    } catch {
      if (stryMutAct_9fa48("1875")) {
        {}
      } else {
        stryCov_9fa48("1875");
        opusScriptCtor = null;
        return null;
      }
    }
  }
}
function toCodecBuffer(bytes: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("1876")) {
    {}
  } else {
    stryCov_9fa48("1876");
    const BufferCtor = (globalThis as {
      Buffer?: {
        from(data: Uint8Array): Uint8Array;
      };
    }).Buffer;
    return (stryMutAct_9fa48("1879") ? BufferCtor === undefined : stryMutAct_9fa48("1878") ? false : stryMutAct_9fa48("1877") ? true : (stryCov_9fa48("1877", "1878", "1879"), BufferCtor !== undefined)) ? BufferCtor.from(bytes) : bytes;
  }
}
function float32ToInt16Pcm(bytes: Uint8Array, channels: number): Uint8Array {
  if (stryMutAct_9fa48("1880")) {
    {}
  } else {
    stryCov_9fa48("1880");
    if (stryMutAct_9fa48("1883") ? bytes.byteLength % (4 * channels) === 0 : stryMutAct_9fa48("1882") ? false : stryMutAct_9fa48("1881") ? true : (stryCov_9fa48("1881", "1882", "1883"), (stryMutAct_9fa48("1884") ? bytes.byteLength * (4 * channels) : (stryCov_9fa48("1884"), bytes.byteLength % (stryMutAct_9fa48("1885") ? 4 / channels : (stryCov_9fa48("1885"), 4 * channels)))) !== 0)) {
      if (stryMutAct_9fa48("1886")) {
        {}
      } else {
        stryCov_9fa48("1886");
        throw new Error(stryMutAct_9fa48("1887") ? "" : (stryCov_9fa48("1887"), "PCM input must contain interleaved float32 samples."));
      }
    }
    const floats = new Float32Array(bytes.buffer, bytes.byteOffset, stryMutAct_9fa48("1888") ? bytes.byteLength * 4 : (stryCov_9fa48("1888"), bytes.byteLength / 4));
    const pcm = new Int16Array(floats.length);
    for (let index = 0; stryMutAct_9fa48("1891") ? index >= floats.length : stryMutAct_9fa48("1890") ? index <= floats.length : stryMutAct_9fa48("1889") ? false : (stryCov_9fa48("1889", "1890", "1891"), index < floats.length); stryMutAct_9fa48("1892") ? index -= 1 : (stryCov_9fa48("1892"), index += 1)) {
      if (stryMutAct_9fa48("1893")) {
        {}
      } else {
        stryCov_9fa48("1893");
        const sample = stryMutAct_9fa48("1894") ? Math.min(-1, Math.min(1, floats[index] ?? 0)) : (stryCov_9fa48("1894"), Math.max(stryMutAct_9fa48("1895") ? +1 : (stryCov_9fa48("1895"), -1), stryMutAct_9fa48("1896") ? Math.max(1, floats[index] ?? 0) : (stryCov_9fa48("1896"), Math.min(1, stryMutAct_9fa48("1897") ? floats[index] && 0 : (stryCov_9fa48("1897"), floats[index] ?? 0)))));
        pcm[index] = (stryMutAct_9fa48("1901") ? sample >= 0 : stryMutAct_9fa48("1900") ? sample <= 0 : stryMutAct_9fa48("1899") ? false : stryMutAct_9fa48("1898") ? true : (stryCov_9fa48("1898", "1899", "1900", "1901"), sample < 0)) ? Math.round(stryMutAct_9fa48("1902") ? sample / 0x8000 : (stryCov_9fa48("1902"), sample * 0x8000)) : Math.round(stryMutAct_9fa48("1903") ? sample / 0x7fff : (stryCov_9fa48("1903"), sample * 0x7fff));
      }
    }
    return new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  }
}
function int16PcmToFloat32(bytes: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("1904")) {
    {}
  } else {
    stryCov_9fa48("1904");
    if (stryMutAct_9fa48("1907") ? bytes.byteLength % 2 === 0 : stryMutAct_9fa48("1906") ? false : stryMutAct_9fa48("1905") ? true : (stryCov_9fa48("1905", "1906", "1907"), (stryMutAct_9fa48("1908") ? bytes.byteLength * 2 : (stryCov_9fa48("1908"), bytes.byteLength % 2)) !== 0)) throw new Error(stryMutAct_9fa48("1909") ? "" : (stryCov_9fa48("1909"), "PCM output must contain int16 samples."));
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, stryMutAct_9fa48("1910") ? bytes.byteLength * 2 : (stryCov_9fa48("1910"), bytes.byteLength / 2));
    const floats = new Float32Array(pcm.length);
    for (let index = 0; stryMutAct_9fa48("1913") ? index >= pcm.length : stryMutAct_9fa48("1912") ? index <= pcm.length : stryMutAct_9fa48("1911") ? false : (stryCov_9fa48("1911", "1912", "1913"), index < pcm.length); stryMutAct_9fa48("1914") ? index -= 1 : (stryCov_9fa48("1914"), index += 1)) {
      if (stryMutAct_9fa48("1915")) {
        {}
      } else {
        stryCov_9fa48("1915");
        floats[index] = stryMutAct_9fa48("1916") ? (pcm[index] ?? 0) * 32768 : (stryCov_9fa48("1916"), (stryMutAct_9fa48("1917") ? pcm[index] && 0 : (stryCov_9fa48("1917"), pcm[index] ?? 0)) / 32768);
      }
    }
    return new Uint8Array(floats.buffer, floats.byteOffset, floats.byteLength);
  }
}
function opusScriptOptions(): {
  wasm: boolean;
} {
  if (stryMutAct_9fa48("1918")) {
    {}
  } else {
    stryCov_9fa48("1918");
    // Hermes advertises WebAssembly, but Emscripten Opus WASM can hang indefinitely
    // there. Prefer asm.js on Hermes; it needs the utf-16le TextDecoder patch below.
    const hermes = stryMutAct_9fa48("1921") ? typeof (globalThis as {
      HermesInternal?: unknown;
    }).HermesInternal === "undefined" : stryMutAct_9fa48("1920") ? false : stryMutAct_9fa48("1919") ? true : (stryCov_9fa48("1919", "1920", "1921"), typeof (globalThis as {
      HermesInternal?: unknown;
    }).HermesInternal !== (stryMutAct_9fa48("1922") ? "" : (stryCov_9fa48("1922"), "undefined")));
    if (stryMutAct_9fa48("1924") ? false : stryMutAct_9fa48("1923") ? true : (stryCov_9fa48("1923", "1924"), hermes)) return stryMutAct_9fa48("1925") ? {} : (stryCov_9fa48("1925"), {
      wasm: stryMutAct_9fa48("1926") ? true : (stryCov_9fa48("1926"), false)
    });
    return stryMutAct_9fa48("1927") ? {} : (stryCov_9fa48("1927"), {
      wasm: stryMutAct_9fa48("1930") ? typeof (globalThis as {
        WebAssembly?: unknown;
      }).WebAssembly === "undefined" : stryMutAct_9fa48("1929") ? false : stryMutAct_9fa48("1928") ? true : (stryCov_9fa48("1928", "1929", "1930"), typeof (globalThis as {
        WebAssembly?: unknown;
      }).WebAssembly !== (stryMutAct_9fa48("1931") ? "" : (stryCov_9fa48("1931"), "undefined")))
    });
  }
}

/** Bare/JSC rejects `utf-16le`; Emscripten asm.js Opus constructs that decoder at load. */
export function ensureUtf16LeTextDecoder(): void {
  if (stryMutAct_9fa48("1932")) {
    {}
  } else {
    stryCov_9fa48("1932");
    type Decoder = {
      decode(input?: ArrayBuffer | ArrayBufferView, options?: unknown): string;
    };
    const current = (globalThis as {
      TextDecoder?: (new (label?: string, options?: unknown) => Decoder) & {
        __tpUtf16LePatched?: boolean;
      };
    }).TextDecoder;
    if (stryMutAct_9fa48("1935") ? typeof current === "function" : stryMutAct_9fa48("1934") ? false : stryMutAct_9fa48("1933") ? true : (stryCov_9fa48("1933", "1934", "1935"), typeof current !== (stryMutAct_9fa48("1936") ? "" : (stryCov_9fa48("1936"), "function")))) return;
    if (stryMutAct_9fa48("1939") ? current.__tpUtf16LePatched !== true : stryMutAct_9fa48("1938") ? false : stryMutAct_9fa48("1937") ? true : (stryCov_9fa48("1937", "1938", "1939"), current.__tpUtf16LePatched === (stryMutAct_9fa48("1940") ? false : (stryCov_9fa48("1940"), true)))) return;
    const Original = current;
    function TextDecoder(this: {
      _utf16le: boolean;
      _inner: Decoder | null;
    }, label?: string, options?: unknown) {
      if (stryMutAct_9fa48("1941")) {
        {}
      } else {
        stryCov_9fa48("1941");
        const normalized = stryMutAct_9fa48("1942") ? String(label ?? "utf-8").toUpperCase().replace(/_/g, "-") : (stryCov_9fa48("1942"), String(stryMutAct_9fa48("1943") ? label && "utf-8" : (stryCov_9fa48("1943"), label ?? (stryMutAct_9fa48("1944") ? "" : (stryCov_9fa48("1944"), "utf-8")))).toLowerCase().replace(/_/g, stryMutAct_9fa48("1945") ? "" : (stryCov_9fa48("1945"), "-")));
        this._utf16le = stryMutAct_9fa48("1948") ? normalized === "utf-16le" && normalized === "utf-16" : stryMutAct_9fa48("1947") ? false : stryMutAct_9fa48("1946") ? true : (stryCov_9fa48("1946", "1947", "1948"), (stryMutAct_9fa48("1950") ? normalized !== "utf-16le" : stryMutAct_9fa48("1949") ? false : (stryCov_9fa48("1949", "1950"), normalized === (stryMutAct_9fa48("1951") ? "" : (stryCov_9fa48("1951"), "utf-16le")))) || (stryMutAct_9fa48("1953") ? normalized !== "utf-16" : stryMutAct_9fa48("1952") ? false : (stryCov_9fa48("1952", "1953"), normalized === (stryMutAct_9fa48("1954") ? "" : (stryCov_9fa48("1954"), "utf-16")))));
        this._inner = this._utf16le ? null : new Original(label, options);
      }
    }
    TextDecoder.prototype.decode = function decode(this: {
      _utf16le: boolean;
      _inner: Decoder | null;
    }, input?: ArrayBuffer | ArrayBufferView, options?: unknown): string {
      if (stryMutAct_9fa48("1955")) {
        {}
      } else {
        stryCov_9fa48("1955");
        if (stryMutAct_9fa48("1958") ? false : stryMutAct_9fa48("1957") ? true : stryMutAct_9fa48("1956") ? this._utf16le : (stryCov_9fa48("1956", "1957", "1958"), !this._utf16le)) return this._inner!.decode(input, options);
        if (stryMutAct_9fa48("1961") ? input != null : stryMutAct_9fa48("1960") ? false : stryMutAct_9fa48("1959") ? true : (stryCov_9fa48("1959", "1960", "1961"), input == null)) return stryMutAct_9fa48("1962") ? "Stryker was here!" : (stryCov_9fa48("1962"), "");
        const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        let out = stryMutAct_9fa48("1963") ? "Stryker was here!" : (stryCov_9fa48("1963"), "");
        for (let i = 0; stryMutAct_9fa48("1966") ? i + 1 >= bytes.length : stryMutAct_9fa48("1965") ? i + 1 <= bytes.length : stryMutAct_9fa48("1964") ? false : (stryCov_9fa48("1964", "1965", "1966"), (stryMutAct_9fa48("1967") ? i - 1 : (stryCov_9fa48("1967"), i + 1)) < bytes.length); stryMutAct_9fa48("1968") ? i -= 2 : (stryCov_9fa48("1968"), i += 2)) {
          if (stryMutAct_9fa48("1969")) {
            {}
          } else {
            stryCov_9fa48("1969");
            stryMutAct_9fa48("1970") ? out -= String.fromCharCode(bytes[i]! | bytes[i + 1]! << 8) : (stryCov_9fa48("1970"), out += String.fromCharCode(bytes[i]! | bytes[stryMutAct_9fa48("1971") ? i - 1 : (stryCov_9fa48("1971"), i + 1)]! << 8));
          }
        }
        return out;
      }
    };
    (TextDecoder as {
      __tpUtf16LePatched?: boolean;
    }).__tpUtf16LePatched = stryMutAct_9fa48("1972") ? false : (stryCov_9fa48("1972"), true);
    Object.defineProperty(globalThis, stryMutAct_9fa48("1973") ? "" : (stryCov_9fa48("1973"), "TextDecoder"), stryMutAct_9fa48("1974") ? {} : (stryCov_9fa48("1974"), {
      value: TextDecoder,
      writable: stryMutAct_9fa48("1975") ? false : (stryCov_9fa48("1975"), true),
      configurable: stryMutAct_9fa48("1976") ? false : (stryCov_9fa48("1976"), true)
    }));
    const g = globalThis as {
      global?: {
        TextDecoder?: unknown;
      };
    };
    if (stryMutAct_9fa48("1979") ? g.global === undefined : stryMutAct_9fa48("1978") ? false : stryMutAct_9fa48("1977") ? true : (stryCov_9fa48("1977", "1978", "1979"), g.global !== undefined)) {
      if (stryMutAct_9fa48("1980")) {
        {}
      } else {
        stryCov_9fa48("1980");
        Object.defineProperty(g.global, stryMutAct_9fa48("1981") ? "" : (stryCov_9fa48("1981"), "TextDecoder"), stryMutAct_9fa48("1982") ? {} : (stryCov_9fa48("1982"), {
          value: TextDecoder,
          writable: stryMutAct_9fa48("1983") ? false : (stryCov_9fa48("1983"), true),
          configurable: stryMutAct_9fa48("1984") ? false : (stryCov_9fa48("1984"), true)
        }));
      }
    }
  }
}

/**
 * Host Opus encode/decode via Emscripten libopus (`opusscript`).
 * Used where WebCodecs is unavailable (Bare mobile worklet / Node tests).
 * Prefers WASM when `WebAssembly` exists; falls back to asm.js on BareKit.
 */
export class BundledOpusMediaCodecDriver implements MediaCodecDriver {
  readonly implementation = "bundled-opus" as const;
  private closed = stryMutAct_9fa48("1985") ? true : (stryCov_9fa48("1985"), false);
  private encoder: OpusScriptInstance | null = null;
  private decoder: OpusScriptInstance | null = null;
  private sampleRate = 16_000;
  private channels = 1;
  supports(configuration: MediaCodecConfiguration): boolean {
    if (stryMutAct_9fa48("1986")) {
      {}
    } else {
      stryCov_9fa48("1986");
      if (stryMutAct_9fa48("1989") ? this.closed && configuration.sampleKind !== "audio" : stryMutAct_9fa48("1988") ? false : stryMutAct_9fa48("1987") ? true : (stryCov_9fa48("1987", "1988", "1989"), this.closed || (stryMutAct_9fa48("1991") ? configuration.sampleKind === "audio" : stryMutAct_9fa48("1990") ? false : (stryCov_9fa48("1990", "1991"), configuration.sampleKind !== (stryMutAct_9fa48("1992") ? "" : (stryCov_9fa48("1992"), "audio")))))) return stryMutAct_9fa48("1993") ? true : (stryCov_9fa48("1993"), false);
      if (stryMutAct_9fa48("1996") ? configuration.codec !== "pcm" : stryMutAct_9fa48("1995") ? false : stryMutAct_9fa48("1994") ? true : (stryCov_9fa48("1994", "1995", "1996"), configuration.codec === (stryMutAct_9fa48("1997") ? "" : (stryCov_9fa48("1997"), "pcm")))) return stryMutAct_9fa48("1998") ? false : (stryCov_9fa48("1998"), true);
      if (stryMutAct_9fa48("2001") ? configuration.codec === "opus" : stryMutAct_9fa48("2000") ? false : stryMutAct_9fa48("1999") ? true : (stryCov_9fa48("1999", "2000", "2001"), configuration.codec !== (stryMutAct_9fa48("2002") ? "" : (stryCov_9fa48("2002"), "opus")))) return stryMutAct_9fa48("2003") ? true : (stryCov_9fa48("2003"), false);
      const rate = stryMutAct_9fa48("2004") ? configuration.sampleRate && 16_000 : (stryCov_9fa48("2004"), configuration.sampleRate ?? 16_000);
      return stryMutAct_9fa48("2007") ? loadOpusScript() !== null || [8_000, 12_000, 16_000, 24_000, 48_000].includes(rate) : stryMutAct_9fa48("2006") ? false : stryMutAct_9fa48("2005") ? true : (stryCov_9fa48("2005", "2006", "2007"), (stryMutAct_9fa48("2009") ? loadOpusScript() === null : stryMutAct_9fa48("2008") ? true : (stryCov_9fa48("2008", "2009"), loadOpusScript() !== null)) && (stryMutAct_9fa48("2010") ? [] : (stryCov_9fa48("2010"), [8_000, 12_000, 16_000, 24_000, 48_000])).includes(rate));
    }
  }
  async encode(configuration: MediaCodecConfiguration, sample: RawMediaSample): Promise<EncodedMediaSample> {
    if (stryMutAct_9fa48("2011")) {
      {}
    } else {
      stryCov_9fa48("2011");
      this.assertSupported(configuration);
      if (stryMutAct_9fa48("2014") ? configuration.codec !== "pcm" : stryMutAct_9fa48("2013") ? false : stryMutAct_9fa48("2012") ? true : (stryCov_9fa48("2012", "2013", "2014"), configuration.codec === (stryMutAct_9fa48("2015") ? "" : (stryCov_9fa48("2015"), "pcm")))) return stryMutAct_9fa48("2016") ? {} : (stryCov_9fa48("2016"), {
        ...sample,
        bytes: stryMutAct_9fa48("2017") ? sample.bytes : (stryCov_9fa48("2017"), sample.bytes.slice()),
        codec: stryMutAct_9fa48("2018") ? "" : (stryCov_9fa48("2018"), "pcm")
      });
      const OpusScript = loadOpusScript();
      if (stryMutAct_9fa48("2021") ? OpusScript !== null : stryMutAct_9fa48("2020") ? false : stryMutAct_9fa48("2019") ? true : (stryCov_9fa48("2019", "2020", "2021"), OpusScript === null)) throw new Error(stryMutAct_9fa48("2022") ? "" : (stryCov_9fa48("2022"), "bundled Opus codec is unavailable"));
      const sampleRate = stryMutAct_9fa48("2023") ? configuration.sampleRate && 16_000 : (stryCov_9fa48("2023"), configuration.sampleRate ?? 16_000);
      const channels = stryMutAct_9fa48("2024") ? configuration.channels && 1 : (stryCov_9fa48("2024"), configuration.channels ?? 1);
      const codec = this.ensureEncoder(OpusScript, sampleRate, channels, configuration.bitrateBps);
      const pcm = float32ToInt16Pcm(sample.bytes, channels);
      const frameSize = stryMutAct_9fa48("2025") ? pcm.byteLength * (2 * channels) : (stryCov_9fa48("2025"), pcm.byteLength / (stryMutAct_9fa48("2026") ? 2 / channels : (stryCov_9fa48("2026"), 2 * channels)));
      // libopus accepts 2.5–60 ms frames; reject odd sizes early.
      if (stryMutAct_9fa48("2029") ? false : stryMutAct_9fa48("2028") ? true : stryMutAct_9fa48("2027") ? [2.5, 5, 10, 20, 40, 60].includes(frameSize * 1_000 / sampleRate) : (stryCov_9fa48("2027", "2028", "2029"), !(stryMutAct_9fa48("2030") ? [] : (stryCov_9fa48("2030"), [2.5, 5, 10, 20, 40, 60])).includes(stryMutAct_9fa48("2031") ? frameSize * 1_000 * sampleRate : (stryCov_9fa48("2031"), (stryMutAct_9fa48("2032") ? frameSize / 1_000 : (stryCov_9fa48("2032"), frameSize * 1_000)) / sampleRate)))) {
        if (stryMutAct_9fa48("2033")) {
          {}
        } else {
          stryCov_9fa48("2033");
          throw new Error(stryMutAct_9fa48("2034") ? `` : (stryCov_9fa48("2034"), `Unsupported Opus frame size ${frameSize} at ${sampleRate} Hz`));
        }
      }
      const encoded = codec.encode(toCodecBuffer(pcm), frameSize);
      return stryMutAct_9fa48("2035") ? {} : (stryCov_9fa48("2035"), {
        captureAtUs: sample.captureAtUs,
        bytes: Uint8Array.from(encoded),
        codec: stryMutAct_9fa48("2036") ? "" : (stryCov_9fa48("2036"), "opus")
      });
    }
  }
  async decode(configuration: MediaCodecConfiguration, sample: EncodedMediaSample): Promise<RawMediaSample> {
    if (stryMutAct_9fa48("2037")) {
      {}
    } else {
      stryCov_9fa48("2037");
      this.assertSupported(configuration);
      if (stryMutAct_9fa48("2040") ? configuration.codec !== "pcm" : stryMutAct_9fa48("2039") ? false : stryMutAct_9fa48("2038") ? true : (stryCov_9fa48("2038", "2039", "2040"), configuration.codec === (stryMutAct_9fa48("2041") ? "" : (stryCov_9fa48("2041"), "pcm")))) return stryMutAct_9fa48("2042") ? {} : (stryCov_9fa48("2042"), {
        captureAtUs: sample.captureAtUs,
        bytes: stryMutAct_9fa48("2043") ? sample.bytes : (stryCov_9fa48("2043"), sample.bytes.slice())
      });
      if (stryMutAct_9fa48("2046") ? sample.codec === "opus" : stryMutAct_9fa48("2045") ? false : stryMutAct_9fa48("2044") ? true : (stryCov_9fa48("2044", "2045", "2046"), sample.codec !== (stryMutAct_9fa48("2047") ? "" : (stryCov_9fa48("2047"), "opus")))) throw new Error(stryMutAct_9fa48("2048") ? "" : (stryCov_9fa48("2048"), "Encoded media codec does not match configuration."));
      const OpusScript = loadOpusScript();
      if (stryMutAct_9fa48("2051") ? OpusScript !== null : stryMutAct_9fa48("2050") ? false : stryMutAct_9fa48("2049") ? true : (stryCov_9fa48("2049", "2050", "2051"), OpusScript === null)) throw new Error(stryMutAct_9fa48("2052") ? "" : (stryCov_9fa48("2052"), "bundled Opus codec is unavailable"));
      const sampleRate = stryMutAct_9fa48("2053") ? configuration.sampleRate && 16_000 : (stryCov_9fa48("2053"), configuration.sampleRate ?? 16_000);
      const channels = stryMutAct_9fa48("2054") ? configuration.channels && 1 : (stryCov_9fa48("2054"), configuration.channels ?? 1);
      const codec = this.ensureDecoder(OpusScript, sampleRate, channels);
      const decoded = codec.decode(toCodecBuffer(sample.bytes));
      return stryMutAct_9fa48("2055") ? {} : (stryCov_9fa48("2055"), {
        captureAtUs: sample.captureAtUs,
        bytes: int16PcmToFloat32(Uint8Array.from(decoded))
      });
    }
  }
  async close(): Promise<void> {
    if (stryMutAct_9fa48("2056")) {
      {}
    } else {
      stryCov_9fa48("2056");
      this.closed = stryMutAct_9fa48("2057") ? false : (stryCov_9fa48("2057"), true);
      stryMutAct_9fa48("2058") ? this.encoder.delete() : (stryCov_9fa48("2058"), this.encoder?.delete());
      stryMutAct_9fa48("2059") ? this.decoder.delete() : (stryCov_9fa48("2059"), this.decoder?.delete());
      this.encoder = null;
      this.decoder = null;
    }
  }
  private ensureEncoder(OpusScript: OpusScriptCtor, sampleRate: number, channels: number, bitrateBps: number): OpusScriptInstance {
    if (stryMutAct_9fa48("2060")) {
      {}
    } else {
      stryCov_9fa48("2060");
      if (stryMutAct_9fa48("2063") ? (this.encoder === null || this.sampleRate !== sampleRate) && this.channels !== channels : stryMutAct_9fa48("2062") ? false : stryMutAct_9fa48("2061") ? true : (stryCov_9fa48("2061", "2062", "2063"), (stryMutAct_9fa48("2065") ? this.encoder === null && this.sampleRate !== sampleRate : stryMutAct_9fa48("2064") ? false : (stryCov_9fa48("2064", "2065"), (stryMutAct_9fa48("2067") ? this.encoder !== null : stryMutAct_9fa48("2066") ? false : (stryCov_9fa48("2066", "2067"), this.encoder === null)) || (stryMutAct_9fa48("2069") ? this.sampleRate === sampleRate : stryMutAct_9fa48("2068") ? false : (stryCov_9fa48("2068", "2069"), this.sampleRate !== sampleRate)))) || (stryMutAct_9fa48("2071") ? this.channels === channels : stryMutAct_9fa48("2070") ? false : (stryCov_9fa48("2070", "2071"), this.channels !== channels)))) {
        if (stryMutAct_9fa48("2072")) {
          {}
        } else {
          stryCov_9fa48("2072");
          stryMutAct_9fa48("2073") ? this.encoder.delete() : (stryCov_9fa48("2073"), this.encoder?.delete());
          ensureUtf16LeTextDecoder();
          this.encoder = new OpusScript(sampleRate, channels, OpusScript.Application.VOIP, opusScriptOptions());
          this.sampleRate = sampleRate;
          this.channels = channels;
        }
      }
      this.encoder.setBitrate(bitrateBps);
      return this.encoder;
    }
  }
  private ensureDecoder(OpusScript: OpusScriptCtor, sampleRate: number, channels: number): OpusScriptInstance {
    if (stryMutAct_9fa48("2074")) {
      {}
    } else {
      stryCov_9fa48("2074");
      if (stryMutAct_9fa48("2077") ? (this.decoder === null || this.sampleRate !== sampleRate) && this.channels !== channels : stryMutAct_9fa48("2076") ? false : stryMutAct_9fa48("2075") ? true : (stryCov_9fa48("2075", "2076", "2077"), (stryMutAct_9fa48("2079") ? this.decoder === null && this.sampleRate !== sampleRate : stryMutAct_9fa48("2078") ? false : (stryCov_9fa48("2078", "2079"), (stryMutAct_9fa48("2081") ? this.decoder !== null : stryMutAct_9fa48("2080") ? false : (stryCov_9fa48("2080", "2081"), this.decoder === null)) || (stryMutAct_9fa48("2083") ? this.sampleRate === sampleRate : stryMutAct_9fa48("2082") ? false : (stryCov_9fa48("2082", "2083"), this.sampleRate !== sampleRate)))) || (stryMutAct_9fa48("2085") ? this.channels === channels : stryMutAct_9fa48("2084") ? false : (stryCov_9fa48("2084", "2085"), this.channels !== channels)))) {
        if (stryMutAct_9fa48("2086")) {
          {}
        } else {
          stryCov_9fa48("2086");
          stryMutAct_9fa48("2087") ? this.decoder.delete() : (stryCov_9fa48("2087"), this.decoder?.delete());
          ensureUtf16LeTextDecoder();
          this.decoder = new OpusScript(sampleRate, channels, OpusScript.Application.VOIP, opusScriptOptions());
          this.sampleRate = sampleRate;
          this.channels = channels;
        }
      }
      return this.decoder;
    }
  }
  private assertSupported(configuration: MediaCodecConfiguration): void {
    if (stryMutAct_9fa48("2088")) {
      {}
    } else {
      stryCov_9fa48("2088");
      if (stryMutAct_9fa48("2091") ? false : stryMutAct_9fa48("2090") ? true : stryMutAct_9fa48("2089") ? this.supports(configuration) : (stryCov_9fa48("2089", "2090", "2091"), !this.supports(configuration))) throw new Error(stryMutAct_9fa48("2092") ? "" : (stryCov_9fa48("2092"), "bundled Opus configuration is unsupported or closed."));
    }
  }
}