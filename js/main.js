/** 入口：載 meta、建 store、掛上各 panel */

import { createStore } from './store.js';
import { loadMeta } from './data-loader.js';
import { mountTabs } from './ui/tabs.js';
import { mountCardHead } from './ui/card-head.js';
import { mountPersonal } from './ui/personal.js';
import { mountClassSlots } from './ui/class-slots.js';
import { mountAttrs } from './ui/attrs.js';
import { mountElements } from './ui/elements.js';
import { mountSetting } from './ui/setting.js';
import { mountDerived } from './ui/derived.js';
import { mountSkills } from './ui/skills.js';
import { mountStyleBlock } from './ui/style-block.js';

const store = createStore();
const meta = await loadMeta();

if (store.getState().cards.length === 0) {
  store.newCard();
}

const $ = id => document.getElementById(id);

mountTabs(       $('tabs-list'),    store);
mountCardHead(   $('card-head'),    store);
mountPersonal(   $('personal'),     store);
mountClassSlots( $('class-slots'),  store, meta);
mountAttrs(      $('attrs-section'),store);
mountElements(   $('elements'),     store);
mountSetting(    $('setting'),      store);
mountDerived(    $('derived'),      store);

await mountSkills({
  pickerEl:   $('skill-picker'),
  equippedEl: $('equipped-strip'),
  detailEl:   $('sk-detail'),
}, store);
await mountStyleBlock($('style-block'), store);

// 暴露到 window for debug
window.__store = store;
window.__meta = meta;
