// @ts-ignore
import solver from 'javascript-lp-solver';

self.onmessage = (e) => {
  const { model } = e.data;
  
  try {
    let result: any = solver.Solve(model);
    let usedFallback = false;
    
    if (result.feasible === false) {
      // Çözüm bulunamazsa katı sınırları kaldırıp (fallback) tekrar dene
      if (model.constraints.me) delete model.constraints.me.max;
      if (model.constraints.hp) delete model.constraints.hp.max;
      if (model.constraints.ca) delete model.constraints.ca;
      if (model.constraints.p) delete model.constraints.p;
      
      result = solver.Solve(model);
      if (result.feasible !== false) {
        usedFallback = true;
      }
    }
    
    self.postMessage({ success: true, result, usedFallback });
  } catch (err: any) {
    self.postMessage({ success: false, error: err.message });
  }
};
