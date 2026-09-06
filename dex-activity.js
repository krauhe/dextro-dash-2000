/*
 * DEX-ACTIVITY.JS — kobler arkadebevægelse til den importerede aktivitets-API.
 * Almindeligt løb bruger motorens Medium-cardio; supersko bruger Høj-cardio.
 * Ingen BG-fradrag, ekstra insulinmultiplikator eller personlige parametre.
 * Tid er simulerede minutter her; game.js ejer omregningen fra spilsekunder.
 */
(function(root){
    'use strict';
    class DexActivity {
        constructor(engine){this.engine=engine;this.session=null;}

        update({moving=false,superShoes=false}={}){
            const engine=this.engine;
            const intensity=moving?(superShoes?'Høj':'Medium'):null;
            // Stop-/startmetoderne bevarer E1, puls, depoter og efterfølsomhed.
            // Intensitetsskift afslutter kun eksponeringen, aldrig tilstandene.
            if(this.session && (engine.activeAktivitet!==this.session
                || this.session.intensitet!==intensity)){
                if(engine.activeAktivitet===this.session)engine.stopActivity();
                this.session=null;
            }
            if(!intensity || this.session || engine.activeAktivitet)return;

            // Motorens cooldown er en begrænsning på nye træningshandlinger
            // i simulatoren, ikke muskel-/restitutionsfysiologi. DEX må løbe
            // igen med det samme. Kun denne dedikerede spilmotor ejes her;
            // importerede filer og alle fysiologiske eftereffekter bevares.
            engine.exerciseCooldownUntil=0;
            if(engine.startActivity({type:'cardio',intensity,durationMin:null})){
                this.session=engine.activeAktivitet;
            }
        }

        stop(){this.update();}
    }
    root.DexActivity=DexActivity;
    if(typeof module!=='undefined')module.exports=DexActivity;
})(typeof globalThis!=='undefined'?globalThis:window);
