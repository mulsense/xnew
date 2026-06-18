//----------------------------------------------------------------------------------------------------
// Audio — lifecycle-bound audio source component
//
// Wraps an AudioTrack (created via xnew.audio.load) in a Unit so loading and disposal follow the
// component tree: the load promise is registered with xnew.promise so the parent waits for the buffer,
// and the track fades out on finalize. The presence of `auto` selects the usage pattern:
//   - BGM : pass `auto: { loop, fade }` — it starts itself once decoded.
//   - SE  : omit auto and trigger `track.play()` on demand. AudioTrack.play() is itself
//           load-aware and re-triggers from the start, so no awaiting or guarding is needed.
// utils/audio stays lifecycle-free; this is where the track is tied to a Unit's lifetime.
//
// - Audio : component({ url, auto?, volume? }) exposing `track` (the AudioTrack).
//           `auto` is the play() options (`{ offset?, fade?, loop? }`); its mere presence
//           enables auto-play, so `auto: {}` plays once with defaults.
//
// Example:
//   const bgm = xnew(xnew.basics.Audio, { url: 'song.mp3', auto: { loop: true, fade: 1000 } });
//   const se  = xnew(xnew.basics.Audio, { url: 'jump.wav' });
//   button.on('click', () => se.track.play());
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { audio, AudioTrack } from '../utils/audio';

const FINALIZE_FADE_MS = 500;

export function Audio(unit: Unit,
    { url, auto, volume = 1 }:
    { url: string; auto?: { offset?: number; fade?: number; loop?: boolean }; volume?: number }
) {
    const track = audio.load(url);
    track.volume = volume;

    // Let the parent's promise aggregation wait until the buffer is decoded.
    xnew.promise(track.promise);

    // BGM: start on declaration. play() is load-aware, so no need to await the buffer here.
    if (auto) {
        track.play(auto);
    }

    unit.on('finalize', () => track.pause({ fade: FINALIZE_FADE_MS }));

    return {
        get track(): AudioTrack {
            return track;
        },
    };
}
