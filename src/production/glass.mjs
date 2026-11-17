// Frosted compositing in the browser. This does not simulate physical refraction.
export function glassStyle(fill,material){
 if(!material)return {background:fill};
 const rgb=[1,3,5].map(i=>parseInt(fill.slice(i,i+2),16));
 if(material.type==='soft-light')return {background:`rgba(${rgb.join(',')},${material.fillOpacity})`,filter:`blur(${material.blurPixels}px)`,mixBlendMode:'screen'};
 return {background:`rgba(${rgb.join(',')},${material.fillOpacity})`,backdropFilter:`blur(${material.blurPixels}px)`,WebkitBackdropFilter:`blur(${material.blurPixels}px)`,border:`1px solid rgba(255,255,255,${material.borderOpacity})`,boxShadow:`0 8px ${material.shadowBlur}px rgba(0,0,0,${material.shadowOpacity})`};
}
