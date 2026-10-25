export type Rules = { title: string; goal: string; sections: { h: string; items: string[] }[] };

export const RULES: Record<string, Rules> = {
  chess: {
    title: 'Chess',
    goal: 'Trap the other player\'s king so it cannot escape capture (checkmate).',
    sections: [
      { h: 'How to play', items: [
        'White moves first, then you take turns. Tap one of your pieces, then tap a glowing square to move it.',
        'Green dots show where the piece can go. A green ring means you can capture there.',
        'Playing the CPU? You are White. Pick Easy, Medium, or Hard.',
        'UNDO takes back your last move. FLIP spins the board.',
      ] },
      { h: 'How the pieces move', items: [
        'Pawn: forward 1 (2 on its first move). It captures one step diagonally forward.',
        'Rook: any distance in a straight line. Bishop: any distance diagonally.',
        'Queen: any distance in any direction. King: 1 square in any direction.',
        'Knight: an "L" - two squares one way, then one sideways. It jumps over other pieces.',
      ] },
      { h: 'Special rules', items: [
        'Check: your king is attacked. You must get out of it right away.',
        'Checkmate: your king is attacked and cannot escape - you lose.',
        'Castling: move the king two squares toward a rook, and that rook hops over it. Neither may have moved, and the squares between must be clear and not attacked.',
        'En passant: a pawn that just moved two squares can be captured as if it had moved one.',
        'Promotion: a pawn reaching the far end becomes a queen automatically.',
        'Draws: stalemate (no legal move but not in check), repeating the same position three times, or not enough pieces left to checkmate.',
      ] },
    ],
  },
  checkers: {
    title: 'Checkers',
    goal: 'Capture all of your opponent\'s pieces, or leave them with no legal move.',
    sections: [
      { h: 'How to play', items: [
        'Berry (bottom) moves first. Tap a piece that is bobbing, then tap a green dot to move there.',
        'Pieces move one square diagonally forward onto empty dark squares.',
      ] },
      { h: 'Capturing', items: [
        'Jump over an adjacent enemy piece into the empty square right behind it. The jumped piece is removed.',
        'Jumps are forced: if you can capture, you must.',
        'Keep jumping in the same turn if another jump is available.',
      ] },
      { h: 'Kings', items: [
        'Reach the far row and your piece becomes a king (shown with a gold crown).',
        'Kings move and jump both forward and backward, one square at a time.',
        'Becoming a king ends your turn.',
      ] },
    ],
  },
  connect4: {
    title: 'Connect 4',
    goal: 'Be the first to line up four of your discs - across, up and down, or diagonally.',
    sections: [
      { h: 'How to play', items: [
        'Take turns tapping a column. Your disc drops to the lowest open spot.',
        'Berry goes first. Winning discs flash when four connect.',
        'If the board fills with no four-in-a-row, it is a draw.',
      ] },
      { h: 'Tips', items: [
        'The middle column is the most powerful - it is part of the most possible lines.',
        'Watch for a row of three with open space on either end: that is two ways to win at once.',
        'Block your opponent\'s three before making your own.',
      ] },
    ],
  },
  yahtzee: {
    title: 'Yahtzee',
    goal: 'Score the most points over 13 rounds by making the best dice combinations.',
    sections: [
      { h: 'Your turn', items: [
        'Tap ROLL to throw all 5 dice. You get up to 3 rolls per turn.',
        'After a roll, tap dice to HOLD them (they lift up). Held dice stay put when you roll again.',
        'When you are happy (or out of rolls), tap a glowing box on your scorecard. Each box can only be filled once - you must fill one every turn, even for 0.',
      ] },
      { h: 'Upper section', items: [
        'Ones through Sixes: add up only the dice that show that number.',
        'Score 63 or more in the upper section (for example three of each number) and get a 35-point bonus.',
      ] },
      { h: 'Lower section', items: [
        '3 of a Kind / 4 of a Kind: at least that many matching dice. Score the total of all 5 dice.',
        'Full House: three of one number + two of another = 25.',
        'Small Straight (4 in a row) = 30. Large Straight (5 in a row) = 40.',
        'Yahtzee (all 5 the same) = 50. Chance: any roll, add up all the dice.',
        'Extra Yahtzees: +100 bonus each if you already scored 50 in the Yahtzee box. They also count as a wild card for other boxes.',
      ] },
    ],
  },
  playnine: {
    title: 'Play Nine',
    goal: 'Have the LOWEST total score after 9 holes (rounds). Like golf - low is good!',
    sections: [
      { h: 'Setup', items: [
        'Each player has 8 cards in a 2 x 4 grid, all face down. Flip any 2 of yours to start.',
        'The piles in the middle: the DECK (face down) and the DISCARD pile (top card face up).',
      ] },
      { h: 'On your turn', items: [
        'STEP 1 - Get a card: tap the DECK to draw a new card, OR tap the DISCARD pile to take the face-up card.',
                'Drew from the deck? Tap any card in your grid (face up or face down) to put it there. Do not want it? Tap DISCARD IT & FLIP, then tap one of your face-down cards to flip it. Changed your mind? Tap CANCEL DISCARD.',
        'STEP 2 (took the discard): you must use it - tap any card in your grid to swap it in. Tapped it by mistake? Tap the DISCARD pile again to put it back.',
        'Only ONE face-down card left? A SKIP button appears: draw, then skip to discard it and leave your last card face down. Flipping that last card ends your round, so waiting for a better moment can pay off.',
      ] },
      { h: 'Scoring', items: [
        'Each card is worth its number. The flag card is -5 (great!). A 0 card is worth 0.',
        'Matching pair: two cards with the same number in the same column both score 0 - even high ones!',
        'Exception: two flag cards (-5) in a column do NOT cancel - they keep their points, so the pair scores -10!',
        'Four of a kind: two columns matching with the SAME number earns a -10 bonus (three columns -15, four columns -20).',
        'A hole ends when someone has all 8 cards face up. The other player gets one last turn, then every card is revealed and scored.',
        'After 9 holes, the lowest total wins.',
      ] },
      { h: 'Tips', items: [
        'Take low cards (0-3) and flags from the discard pile. Swap away high cards (9-12) fast.',
        'Matching a column zeroes it out - but do not keep a 12 just hoping for a match.',
      ] },
    ],
  },
  backgammon: {
    title: 'Backgammon',
    goal: 'Move all 15 of your checkers home, then bear them all off the board before your opponent.',
    sections: [
      { h: 'Direction', items: [
        'Berry moves counter-clockwise: top-right, across the top, down the left, along the bottom to the bottom-right home.',
        'Cream goes the opposite way and its home is the top-right. The 6 points in your home are the last 6 before your tray.',
      ] },
      { h: 'Your turn', items: [
        'Tap ROLL. Each die is a separate move: move one checker that many points. Doubles give you four moves.',
        'Tap a glowing checker, then tap a green dot to move it. Used dice fade out.',
        'You may land on an empty point, a point with your own checkers, or a point with just ONE enemy checker.',
        'A point with 2 or more enemy checkers is blocked.',
      ] },
      { h: 'Hitting and the bar', items: [
        'Landing on a lone enemy checker HITS it. It goes to the bar (middle strip).',
        'If you have a checker on the bar you must bring it back in before doing anything else. It enters in your opponent\'s home, matching a die number.',
        'You must use as many dice as you can. If only one die can be played, you must play the larger one.',
        'No legal move? The turn passes automatically.',
      ] },
      { h: 'Bearing off', items: [
        'Once ALL 15 of your checkers are in your home board, you can remove them: tap a checker then your tray.',
        'A die that matches a point number removes a checker from that point. A bigger die can remove from your furthest point if nothing is further back.',
        'First to bear off all 15 wins. (This version has no doubling cube or gammon bonuses.)',
      ] },
    ],
  },
  dominoes: {
    title: 'Dominoes',
    goal: 'Get rid of all your tiles first, or have the fewest pips left when the game blocks. First to 100 points wins.',
    sections: [
      { h: 'Setup', items: [
        'A double-six set has 28 tiles. Each player gets 7. The rest wait in the draw pile.',
        'Playing two players on one screen? Your tiles hide behind a "pass the iPad" screen between turns.',
      ] },
      { h: 'Your turn', items: [
        'Play a tile whose number matches one end of the line. Glowing tiles are playable; dim ones are not.',
        'If a tile fits both ends, tap it and choose LEFT or RIGHT.',
        'No match? Tap DRAW until you get one. If the draw pile is empty, tap PASS.',
      ] },
      { h: 'Scoring', items: [
        'Empty your hand first and you win the round: you score all the pips (dots) left in your opponent\'s hand.',
        'If both players are stuck, the player with fewer pips wins the round and scores the difference.',
        'Rounds repeat until someone reaches 100 points.',
      ] },
    ],
  },
  mancala: {
    title: 'Mancala',
    goal: 'Collect more stones in your store than your opponent by the time one side runs out.',
    sections: [
      { h: 'Setup', items: [
        'The board has 6 pits on each side, each starting with 4 stones. The big pit at the end is a store.',
        'Your pits are the bottom row (P1) or the top row (P2/CPU). Your store is on YOUR right: the right end for P1, the left end for P2.',
      ] },
      { h: 'Your turn', items: [
        'Tap one of your pits that has stones. All its stones are picked up and dropped one at a time into the next pits, counter-clockwise (bottom row left to right, then along the top right to left).',
        'Drop one in your own store as you pass it - but skip your opponent\'s store.',
        'Your last stone decides what happens next:',
        'EXTRA TURN: it lands in your own store - go again!',
        'CAPTURE: it lands in an empty pit on YOUR side and the pit directly opposite has stones - you take them all, plus your last stone, into your store.',
        'Otherwise your turn ends.',
      ] },
      { h: 'Ending the game', items: [
        'The game ends when all six pits on one side are empty. The other player puts all their remaining stones into their own store.',
        'Whoever has more stones in their store wins. Equal stones is a draw.',
      ] },
      { h: 'Tips', items: [
        'Count your pits: a pit with exactly the right number of stones to reach your store gives a free extra turn.',
        'Keep stones in the pits near your store for later extra turns, and watch for empty pits you can capture with.',
      ] },
    ],
  },
  battleship: {
    title: 'Battleship',
    goal: 'Find and sink all 5 of your opponent\'s hidden boats before they sink yours.',
    sections: [
      { h: 'Placing your boats', items: [
        'Each player secretly places 5 boats on their own 10 x 10 pond: lengths 5, 4, 3, 3 and 2.',
        'Tap a boat in the list, then tap the pond to put it there. ROTATE turns it. Tap a placed boat to select it, then tap a new spot to move it, or ROTATE to spin it in place. SHUFFLE places them all at random.',
        'Boats cannot overlap or hang off the edge, and they can\'t move once the battle starts.',
        'Playing a friend on one iPad? A "pass the iPad" screen hides your pond - only look at the screen when it is your turn.',
      ] },
      { h: 'Taking a shot', items: [
        'On your turn you see the enemy pond (blue, with a number and letter grid). Tap a square to aim - a crosshair appears. Tap FIRE! (or tap the same square again) to shoot.',
        'BOOM = you hit a boat. SPLASH = a miss, shown as a ripple.',
        'When every square of a boat has been hit, it sinks and its smiling boat is revealed. You are told which boat it was.',
        'Your own pond (YOUR BOATS) shows where the enemy has shot at you.',
      ] },
      { h: 'Winning', items: [
        'Turns alternate after every shot, hit or miss.',
        'The first player to sink all 5 enemy boats wins.',
      ] },
      { h: 'Tips', items: [
        'Shoot a checkerboard pattern (every other square) to find boats fast - even the smallest boat is 2 long.',
        'After a hit, shoot the squares next to it to find which way the boat points.',
        'Playing the CPU? Easy shoots at random, Hard works out the most likely spots.',
      ] },
    ],
  },
};
