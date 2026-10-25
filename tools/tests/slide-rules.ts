import { newSlide, legalMoves, play, ringOf, SLIDES, PEN, type SState } from '../../src/lib/slide';
const ok=(c:boolean,m:string)=>console.log(c?'ok  ':'FAIL',m);
let s=newSlide([0,2]); s={...s,turn:0};
// slide: seat0 pawn lands on seat1's slide start (idx 16) -> ends idx 19, bumping a seat2 pawn at idx 18
const sl=SLIDES.find(x=>x.owner===1&&x.start===16)!;
s.pawns[0][0]=16-4-0-4; // q so ring idx = 4+q = 12 -> need landing on 16 with card 4
s.pawns[2][1]=((18-34)+60)%60; // seat2 base 30, exit 34: q = idx-34 mod 60
s={...s,card:4}; // backward 4 wrong direction; use fwd card 3 instead
s.pawns[0][0]=13-4; s={...s,card:3};
let mv=legalMoves(s); const m=mv.find(x=>x.pawn===0)!; const r=play(s,m);
ok(r.info.slide!==null,'landing on opponent slide start slides');
ok(r.info.bumped.some(b=>b.seat===2&&b.pawn===1),'slide bumps pawn on slide squares');
ok(ringOf(0,r.state.pawns[0][0])===sl.end,'ends on slide end '+sl.end);
// sorry
let s2=newSlide([0,2]); s2={...s2,turn:0,card:0}; s2.pawns[2][0]=((20-34)+60)%60;
mv=legalMoves(s2); ok(mv.length===1&&mv[0].kind==='sorry','sorry offers replace');
const r2=play(s2,mv[0]); ok(r2.state.pawns[2][0]===PEN&&ringOf(0,r2.state.pawns[0][mv[0].pawn])===20,'sorry replaces opponent');
// swap
let s3=newSlide([0,2]); s3={...s3,turn:0,card:11}; s3.pawns[0][0]=10; s3.pawns[2][0]=((40-34)+60)%60;
mv=legalMoves(s3); const sw=mv.find(x=>x.kind==='swap')!; ok(!!sw,'swap offered');
const r3=play(s3,sw); ok(ringOf(0,r3.state.pawns[0][0])===40&&ringOf(2,r3.state.pawns[2][0])===ringOf(0,10),'positions swapped');
// seven split
let s4=newSlide([0,2]); s4={...s4,turn:0,card:7}; s4.pawns[0][0]=10; s4.pawns[0][1]=20;
mv=legalMoves(s4); ok(mv.some(x=>x.pawn===0&&x.to===13)&&mv.some(x=>x.pawn===0&&x.to===17),'split options include small and full');
const r4=play(s4,mv.find(x=>x.pawn===0&&x.to===13)!); ok(r4.state.remaining===4&&r4.state.locked===0&&r4.state.turn===0,'split keeps turn');
const rest=legalMoves(r4.state); ok(rest.length>0&&rest.every(x=>x.pawn===1&&x.to===24),'second pawn must move the rest');
const r5=play(r4.state,rest[0]); ok(r5.state.turn===2&&r5.state.card===null,'turn passes after split');
// home exact
let s5=newSlide([0,2]); s5={...s5,turn:0,card:5}; s5.pawns[0][0]=60; mv=legalMoves(s5); ok(mv.some(x=>x.to===64),'exact home ok');
s5.pawns[0][0]=61; mv=legalMoves(s5); ok(!mv.length,'overshoot not allowed');
