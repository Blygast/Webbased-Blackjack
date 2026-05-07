export const chips = [10, 50, 100, 500, 1000];

export const getChipImagePath = (value) =>
  new URL(`../assets/chips/chip_${value}.svg`, import.meta.url).href;
