/**
 * 预注册 Iconify 图标集，避免运行时请求 api.iconify.design（离线/网络受限时 navbar 等 Svelte 图标不显示）
 */
import { addCollection } from "@iconify/svelte";
import { icons as fa6Solid } from "@iconify-json/fa6-solid";
import { icons as materialSymbols } from "@iconify-json/material-symbols";
import { icons as mdi } from "@iconify-json/mdi";

addCollection(materialSymbols);
addCollection(mdi);
addCollection(fa6Solid);
