/**
 * Single entry point for every page.
 *
 * Each .html file loads this, so a cold load initialises whichever page was
 * requested and then hands subsequent navigations to the router. Deep links
 * and no-JS crawlers still get the real document they asked for.
 *
 * All three stylesheets load up front rather than per page: the router keeps
 * one document alive, so loading them lazily would flash unstyled content on
 * the first visit to each page type.
 */
import './style.css'
import './blob.css'
import './project.css'

import { initRouter, runPageInit } from './router.js'

runPageInit()
initRouter()
