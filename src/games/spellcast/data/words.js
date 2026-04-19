const THREE_LETTER_WORDS = [
  'act', 'arc', 'ash', 'awe', 'bar', 'bay', 'bee', 'bow', 'car', 'cat', 'cog', 'cue',
  'dew', 'ear', 'elm', 'era', 'eve', 'fog', 'fox', 'gem', 'glow', 'ice', 'ink',
  'ion', 'ivy', 'jar', 'joy', 'key', 'lag', 'lea', 'log', 'map', 'oak', 'orb',
  'owl', 'ray', 'roe', 'rune', 'sage', 'sea', 'sky', 'sun', 'tag', 'tea', 'urn',
  'vow', 'wax', 'web', 'wind', 'wyrm',
]

const FOUR_LETTER_WORDS = [
  'able', 'acid', 'aero', 'arch', 'area', 'atom', 'aura', 'away', 'axis', 'bark',
  'beam', 'bear', 'bell', 'bind', 'bird', 'bite', 'blue', 'bolt', 'book', 'boom',
  'born', 'bowl', 'brew', 'calm', 'card', 'care', 'case', 'cast', 'cave', 'clay', 'coal',
  'coat', 'code', 'coil', 'cold', 'core', 'crow', 'dawn', 'deal', 'deer', 'dial',
  'door', 'dove', 'draw', 'drum', 'dust', 'echo', 'edge', 'ember', 'fable', 'fern',
  'fire', 'flare', 'flow', 'foam', 'fold', 'forge', 'frost', 'gate', 'gear', 'glow',
  'gold', 'gale', 'grim', 'grow', 'hail', 'hare', 'harp', 'haze', 'heat', 'hive',
  'jade', 'jolt', 'keen', 'kite', 'lava', 'leaf', 'lens', 'light', 'lily', 'loom',
  'lore', 'luna', 'lyre', 'mage', 'mask', 'mist', 'moss', 'nova', 'opal', 'orbit',
  'page', 'path', 'pear', 'pine', 'pool', 'rain', 'reed', 'rift', 'ring', 'rise',
  'robe', 'root', 'rose', 'rust', 'sand', 'seal', 'seed', 'shoe', 'silk', 'sing',
  'site', 'snow', 'soil', 'song', 'spark', 'star', 'stem', 'stone', 'tail', 'tide',
  'tile', 'time', 'tree', 'veil', 'vine', 'void', 'ward', 'wave', 'wind', 'wing',
  'wise', 'wood', 'wool', 'zeal', 'zone',
]

const FIVE_LETTER_WORDS = [
  'adapt', 'amber', 'angle', 'apple', 'arrow', 'beacon', 'berry', 'bloom', 'brave',
  'brick', 'cabin', 'caper', 'cedar', 'charm', 'chime', 'cloud', 'coast', 'cover',
  'craft', 'crane', 'creek', 'crown', 'dream', 'drift', 'earth', 'ember', 'fable',
  'feast', 'field', 'flame', 'flora', 'forge', 'frost', 'glass', 'glide', 'grace',
  'grain', 'grove', 'guard', 'haven', 'heart', 'honey', 'ivory', 'jewel', 'knack',
  'laser', 'latch', 'leafy', 'light', 'lilac', 'lunar', 'magic', 'maple', 'marsh',
  'meadow', 'metal', 'mirth', 'mossy', 'mythic', 'noble', 'oaken', 'oasis', 'ocean',
  'orbit', 'petal', 'pixel', 'prism', 'quill', 'raven', 'rider', 'river', 'robin',
  'rogue', 'royal', 'runey', 'sable', 'scale', 'scope', 'shade', 'shard', 'shore',
  'siren', 'skill', 'slate', 'smoke', 'solar', 'sound', 'spark', 'spell', 'spire',
  'spore', 'sprig', 'stone', 'storm', 'sunny', 'sword', 'tempo', 'thorn', 'tidal',
  'torch', 'tower', 'trace', 'trail', 'valor', 'vapor', 'vivid', 'water', 'whirl',
  'wispy', 'world', 'woven',
]

export const FULL_WORDS = Array.from(
  new Set([...THREE_LETTER_WORDS, ...FOUR_LETTER_WORDS, ...FIVE_LETTER_WORDS].map((word) => word.toLowerCase()))
)

export const COMMON_WORDS = FULL_WORDS.filter((word) => word.length >= 4)
