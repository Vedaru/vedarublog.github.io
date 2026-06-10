/**
 * 预注册 Iconify 图标子集，避免运行时请求 api.iconify.design
 */
import { addCollection } from "@iconify/svelte";
import subset from "./iconify-subset.json";

addCollection(subset.materialSymbols);
addCollection(subset.mdi);
addCollection(subset.fa6Solid);
