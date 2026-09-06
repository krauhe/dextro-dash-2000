/* BG-læringsværkstedets faste, fiktive optagelser og read-only målinger.
 * Genbruger motoren uændret. Ingen personlige input, dosisvalg eller anbefalinger.
 * Partikelvisningen bruger rigtige enkeltfluxer, ikke effektpanelets summerede
 * insulinmål, der ellers ville tælle transport, forbrug og hæmmet tilførsel dobbelt.
 */
(function(root){
    'use strict';
    const cases={
        balance:{title:'In balance',food:false,insulin:false,run:false},
        food:{title:'Food arriving',food:true,insulin:false,run:false},
        insulin:{title:'Food & insulin',food:true,insulin:true,run:false},
        run:{title:'DEX on the move',food:true,insulin:false,run:true},
    };
    function record(name){
        const scenario=cases[name];if(!scenario)throw Error('Unknown demonstration');
        const engine=T1DPhysiologyEngine.createEngine({weight:70,isf:3,icr:10},{
            steadyState:false,noise:false,seed:1987,modules:{dawn:0,dawnVariability:0,
                stressResponse:0,glucotoxicity:0,ketones:0,sleepDisruption:0,
                cgmSensorFaults:false,insulinVariability:0,fatProtein:true,ffaResistance:1},
        });
        engine.initSteadyState({targetBG:6});engine.step(.01);engine.consumeEvents();
        const baselineAction=engine.getPhysiologySnapshot().insulin.x1;
        // Et på forhånd fastlagt spilforløb, ikke et forslag udledt af BG.
        if(scenario.food){
            const food=DEXTRO_NEW_FOODS.apple;
            engine.addFood({...food.referenceNutrition,carbParams:food.carbParams});
        }
        if(scenario.insulin)engine.addRapidInsulin({units:1});
        if(scenario.run)engine.startActivity({type:'cardio',intensity:'Lav',durationMin:45});
        const frames=[];
        for(let step=0;step<=720;step++){
            engine.step(.25);engine.consumeEvents();
            const s=engine.getState(),p=engine.getPhysiologySnapshot(),h=engine.hovorka;
            const q1=h.state[HOVORKA_STATE_IDX.Q1],q2=h.state[HOVORKA_STATE_IDX.Q2];
            const rapidPlasma=Math.max(0,(h.state[HOVORKA_STATE_IDX.I]-h.state[HOVORKA_STATE_IDX.Ib])*h.V_I);
            // HUD'ens COB er et tidsestimat. En beholder, der fysisk tømmes,
            // viser her de faktiske D1+D2-puljer, så den ikke bliver tom mens
            // glukose stadig optages. Begge værdier bevares til inspektion.
            frames.push({minutes:step*.25,bg:s.trueBG,
                cob:(p.food.carbsInStomach+p.food.carbsInGut)*.18,hudCOB:s.cob,iob:s.displayIOB,
                food:Math.max(0,p.food.carbAbsorption),liver:Math.max(0,p.liver.egp),
                transport:p.insulin.x1*q1-h.k_12*q2,
                background:Math.max(0,p.brain.f01c),renal:Math.max(0,h._lastFR||0),
                muscle:Math.max(0,h.beta*p.exercise.e1),
                disposal:Math.max(0,p.insulin.x2*q2),
                action:p.insulin.x1/baselineAction,
                insulinClearance:h.k_e*rapidPlasma/1000,
                running:scenario.run&&step*.25<45?1:0,
            });
        }
        return frames;
    }
    function sample(frames,minutes){
        const index=Math.min(frames.length-1,Math.max(0,minutes*4));
        const low=Math.floor(index),high=Math.min(frames.length-1,low+1),t=index-low;
        return Object.fromEntries(Object.keys(frames[low]).map(key=>
            [key,frames[low][key]+(frames[high][key]-frames[low][key])*t]));
    }
    root.DexBGLearning={cases,record,sample};
})(globalThis);
