import type {Settings} from './storage';
export class NoiseEngine {
  context:AudioContext|null=null;
  worklet:AudioWorkletNode|null=null;
  analyser:AnalyserNode|null=null;
  private lowFilter:BiquadFilterNode|null=null;
  private highFilter:BiquadFilterNode|null=null;
  private gain:GainNode|null=null;
  private stopTimer:number|undefined;
  private generation=0;
  get playing(){return !!this.context && this.context.state==='running';}
  async start(settings:Settings) {
    if(this.context){await this.context.resume();this.update(settings);return;}
    const context=new AudioContext();
    try {
      await context.audioWorklet.addModule(new URL('worklet.js',document.baseURI).href);
      const node=new AudioWorkletNode(context,'noise-processor',{outputChannelCount:[2]});
      const high=context.createBiquadFilter();high.type='highpass';high.Q.value=.707;
      const low=context.createBiquadFilter();low.type='lowpass';low.Q.value=.707;
      const gain=context.createGain();gain.gain.value=0;
      const analyser=context.createAnalyser();analyser.fftSize=2048;
      node.connect(high).connect(low).connect(gain).connect(analyser).connect(context.destination);
      this.context=context;this.worklet=node;this.highFilter=high;this.lowFilter=low;this.gain=gain;this.analyser=analyser;
      this.update(settings);
      await context.resume();
      this.ramp(settings.volume/100,settings.fade);
    }catch(error){await context.close();throw error;}
  }
  update(s:Settings){
    if(!this.context)return;
    const now=this.context.currentTime;
    const nyquist=this.context.sampleRate/2;
    this.worklet?.port.postMessage({slope:s.slope,width:s.width/100});
    this.highFilter?.frequency.setTargetAtTime(Math.max(10,Math.min(s.low,nyquist*.9)),now,.04);
    this.lowFilter?.frequency.setTargetAtTime(Math.max(30,Math.min(s.high,nyquist*.98)),now,.04);
    this.gain?.gain.setTargetAtTime(s.volume/100,now,.04);
  }
  private ramp(target:number,seconds:number){
    if(!this.context||!this.gain)return;
    const now=this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value,now);
    this.gain.gain.linearRampToValueAtTime(target,now+Math.max(.02,seconds));
  }
  async stop(fade:number){
    const context=this.context;if(!context)return;
    const generation=++this.generation;
    this.ramp(0,fade);
    window.clearTimeout(this.stopTimer);
    await new Promise<void>(resolve=>{this.stopTimer=window.setTimeout(resolve,Math.max(30,fade*1000+30));});
    if(generation!==this.generation)return;
    this.context=null;this.worklet=null;this.analyser=null;this.gain=null;this.highFilter=null;this.lowFilter=null;
    await context.close();
  }
  async exportWav(s:Settings,duration:number):Promise<Blob>{
    const rate=44100;const frames=Math.ceil(duration*rate);
    const offline=new OfflineAudioContext(2,frames,rate);
    if(!offline.audioWorklet)throw new Error('Dieser Browser unterstützt keinen OfflineAudioContext mit AudioWorklet. Bitte WAV-Export in einem aktuellen Desktop-Browser versuchen.');
    await offline.audioWorklet.addModule(new URL('worklet.js',document.baseURI).href);
    const node=new AudioWorkletNode(offline,'noise-processor',{outputChannelCount:[2]});
    node.port.postMessage({slope:s.slope,width:s.width/100});
    const high=offline.createBiquadFilter();high.type='highpass';high.frequency.value=s.low;high.Q.value=.707;
    const low=offline.createBiquadFilter();low.type='lowpass';low.frequency.value=Math.min(s.high,rate*.49);low.Q.value=.707;
    const gain=offline.createGain();gain.gain.value=s.volume/100;
    node.connect(high).connect(low).connect(gain).connect(offline.destination);
    const buffer=await offline.startRendering();
    const bytes=new ArrayBuffer(44+frames*4);const view=new DataView(bytes);
    const str=(at:number,text:string)=>{for(let i=0;i<text.length;i++)view.setUint8(at+i,text.charCodeAt(i));};
    str(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');
    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);
    view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);
    str(36,'data');view.setUint32(40,frames*4,true);
    const l=buffer.getChannelData(0),r=buffer.getChannelData(1);
    for(let i=0;i<frames;i++){
      const a=Math.max(-1,Math.min(1,l[i])),b=Math.max(-1,Math.min(1,r[i]));
      view.setInt16(44+i*4,a<0?a*32768:a*32767,true);
      view.setInt16(46+i*4,b<0?b*32768:b*32767,true);
    }
    return new Blob([bytes],{type:'audio/wav'});
  }
}
