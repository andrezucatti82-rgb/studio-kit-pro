import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {ProductionFilm} from './ProductionFilm';
import type {RenderPlan} from './types';
const placeholder={} as RenderPlan;
registerRoot(()=> <Composition id="GdaProduction" component={ProductionFilm} width={1280} height={720} fps={30} durationInFrames={900} defaultProps={{plan:placeholder}} calculateMetadata={({props}:{props:{plan:RenderPlan}})=>({width:props.plan.output.width,height:props.plan.output.height,fps:props.plan.output.fps,durationInFrames:props.plan.output.durationFrames})}/>);
