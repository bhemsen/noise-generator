/* Self-contained DSP: each sample is synthesized in the audio rendering thread. */
class NoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.slope = -6;
    this.width = 1;
    this.state = Array.from({length: 3}, () => this.freshState());
    this.port.onmessage = ({data}) => {
      if (typeof data.slope === 'number') this.slope = Math.max(-12, Math.min(12, data.slope));
      if (typeof data.width === 'number') this.width = Math.max(0, Math.min(1, data.width));
    };
  }
  freshState() { return {b0:0,b1:0,b2:0,b3:0,b4:0,b5:0,b6:0,brown:0,prevPink:0,prevWhite:0}; }
  sample(s) {
    const w = Math.random()*2-1;
    s.b0 = .99886*s.b0 + w*.0555179;
    s.b1 = .99332*s.b1 + w*.0750759;
    s.b2 = .96900*s.b2 + w*.1538520;
    s.b3 = .86650*s.b3 + w*.3104856;
    s.b4 = .55000*s.b4 + w*.5329522;
    s.b5 = -.7616*s.b5 - w*.0168980;
    const pink = (s.b0+s.b1+s.b2+s.b3+s.b4+s.b5+s.b6+w*.5362)*.11;
    s.b6 = w*.115926;
    s.brown = (s.brown + w*.02)/1.02;
    const brown = s.brown*3.5;
    const blue = (pink-s.prevPink)*1.7;
    const violet = (w-s.prevWhite)*.7;
    s.prevPink=pink; s.prevWhite=w;
    // Endpoints are approximate 1/f^alpha colors, not calibrated octave slopes.
    const colors = [brown,pink,w,blue,violet];
    const position = (this.slope+6)/3;
    const a = Math.max(0,Math.min(4,Math.floor(position)));
    const b = Math.min(4,a+1);
    const t = Math.max(0,Math.min(1,position-a));
    return colors[a]*(1-t)+colors[b]*t;
  }
  process(_inputs, outputs) {
    const output=outputs[0];
    if (!output || !output[0]) return true;
    const left=output[0],right=output[1];
    const width=this.width;
    const sharedGain=Math.sqrt(1-width), independentGain=Math.sqrt(width);
    for(let i=0;i<left.length;i++) {
      const common=this.sample(this.state[0]);
      left[i]=(common*sharedGain+this.sample(this.state[1])*independentGain)*.20;
      if(right) right[i]=(common*sharedGain+this.sample(this.state[2])*independentGain)*.20;
    }
    return true;
  }
}
registerProcessor('noise-processor',NoiseProcessor);
