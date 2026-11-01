# CRITICAL VOICE OUTPUT PIPELINE RULES

The current voice itself is already correct and must NOT be changed.

Do not alter:
- voice identity
- gender
- maturity
- pitch
- softness
- accent
- personality
- speaking style

ONLY fix the way emotional instructions and generated text are passed to speech synthesis.

---

## 1. NEVER SPEAK INTERNAL EMOTION INSTRUCTIONS

Internal emotion/style instructions such as:

[warmly]
[happily]
[sadly]
[excited]
[angrily]
[softly]
[calmly]
[whispers]
[laughs]
[sighs]
[gasps]

are NEVER part of the words the user should hear.

If the model internally generates:

[warmly] Hey Boss. What are we working on today?

The visible response may contain the natural sentence:

"Hey Boss. What are we working on today?"

The TTS engine MUST receive ONLY:

"Hey Boss. What are we working on today?"

It must NEVER receive:

"[warmly] Hey Boss. What are we working on today?"

The emotion instruction must control vocal delivery only.

---

## 2. SEPARATE RESPONSE TEXT FROM VOICE DIRECTIVES

Treat these as two separate data fields:

RESPONSE_TEXT
= the exact words the assistant intends to communicate.

VOICE_STYLE / EMOTION
= metadata controlling how those words should be spoken.

Never combine them into one string.

Conceptually:

{
  "text": "Hey Boss. What are we working on today?",
  "emotion": "warm"
}

NOT:

{
  "text": "[warmly] Hey Boss. What are we working on today?"
}

The TTS layer must synthesize only the `text` field.

---

## 3. STRIP INTERNAL TAGS BEFORE TTS

If the model output contains emotional or performance markers such as:

[warmly]
[happily]
[excited]
[sadly]
[angrily]
[softly]
[calmly]
[laughs]
[sighs]
[gasps]

remove those markers before sending the text to the speech synthesis engine.

Do NOT remove the actual spoken words surrounding them.

Example:

MODEL OUTPUT:
[warmly] Hey Boss. What are we working on today?

TTS INPUT:
Hey Boss. What are we working on today?

Example:

MODEL OUTPUT:
[excited] Wait, seriously?!

TTS INPUT:
Wait, seriously?!

The emotional quality should come from the voice/prosody configuration, not from spoken bracketed instructions.

---

## 4. NEVER ALTER OR DROP SPOKEN WORDS

The TTS input must contain the complete response text.

If the assistant generates:

"Hey Boss. What are we working on today?"

the speech engine MUST speak:

"Hey Boss. What are we working on today?"

Do NOT shorten it to:

"What are we working on today?"

Do NOT remove:

- greetings
- names
- forms of address
- first words
- last words
- short phrases
- contractions
- interjections

Every word in the generated response must remain present in the TTS input unless it is explicitly marked as non-spoken metadata.

---

## 5. TEXT DISPLAY AND TTS MUST COME FROM THE SAME CANONICAL RESPONSE

Generate ONE canonical response text.

Use that same canonical text for:

1. chat display
2. TTS synthesis

Do not independently regenerate, summarize, shorten, or paraphrase the response for TTS.

Example:

CANONICAL RESPONSE:
"Hey Boss. What are we working on today?"

DISPLAY:
"Hey Boss. What are we working on today?"

TTS:
"Hey Boss. What are we working on today?"

All three must match.

---

## 6. DO NOT LET TTS SUMMARIZE THE RESPONSE

The speech system is a renderer, not a second language model.

It must NOT decide:

"This greeting is unnecessary."

It must NOT remove introductory phrases.

It must NOT summarize.

It must NOT paraphrase.

It must NOT skip names.

It must NOT optimize away short phrases.

If the canonical response says:

"Hey Boss. What are we working on today?"

then all of those words must be spoken.

---

## 7. NATURAL EMOTION MUST STILL WORK

Emotional instructions should influence the delivery without becoming audible words.

For example:

Internal:

emotion = warm

Text:

"Hey Boss. What are we working on today?"

The voice should sound warm while speaking the exact sentence.

Internal:

emotion = surprised

Text:

"Wait, seriously?"

The voice should sound surprised while speaking the exact sentence.

Internal:

emotion = amused

Text:

"Okay, that was actually funny."

The voice should sound amused while speaking the exact sentence.

The user should hear the emotion, never the instruction describing the emotion.

---

## 8. NON-VERBAL EXPRESSIONS

If natural vocal expressions such as laughter, sighs, gasps, or breaths are supported by the TTS engine, they may be incorporated naturally.

However, they must not accidentally become literal spoken words.

For example:

Internal intent:
brief amused laugh

Spoken output:
natural brief laugh followed by the sentence

NOT:

"laughs Okay, that's funny."

Likewise:

Internal intent:
soft sigh

Spoken output:
natural sigh followed by the sentence

NOT:

"sigh Okay, let's try again."

Only use these expressions when contextually appropriate.

Do not insert them into every response.

---

## 9. PRESERVE THE COMPLETE RESPONSE

Before sending anything to TTS, perform a final text-integrity check.

Verify:

- First spoken word is present.
- Last spoken word is present.
- Names are present.
- Greetings are present.
- Short phrases are present.
- Questions are present.
- No sentence has been truncated.
- No words have been silently removed.
- No emotion metadata is being spoken.
- No internal instructions are being spoken.

If the displayed response contains N spoken words, the TTS input should contain those same N spoken words, apart from explicitly non-spoken metadata.

---

## 10. FINAL TTS RULE

The speech synthesis layer must follow this exact principle:

GENERATED RESPONSE
↓
SEPARATE METADATA FROM SPOKEN TEXT
↓
REMOVE NON-SPOKEN EMOTION TAGS
↓
PRESERVE 100% OF SPOKEN TEXT
↓
APPLY EMOTIONAL PROSODY
↓
SYNTHESIZE

Never:

GENERATED RESPONSE
↓
TTS MODEL DECIDES WHAT TO SKIP
↓
SHORTENED SPEECH

The assistant controls HOW the sentence sounds.

It must never change WHAT sentence is spoken.

---

# ABSOLUTE RULE

Emotion is metadata.

Words are content.

Emotion metadata must never be spoken.

Spoken content must never be silently removed.

---

# CRITICAL: TOOL CALLS MUST ALWAYS COMPLETE THE USER'S REQUEST

When the assistant uses a tool, the tool call is an intermediate step, NOT the final response.

NEVER stop after executing a tool.

NEVER respond with statements such as:

"I have executed the requested command: google_web_search."

"The requested command was executed."

"Search completed."

"Information retrieved."

"Tool executed successfully."

These are internal execution/status messages and must never be presented as the assistant's final answer.

---

## REQUIRED TOOL FLOW

Whenever a tool is needed, ALWAYS follow this sequence:

USER REQUEST
↓
UNDERSTAND THE REQUEST
↓
CALL THE APPROPRIATE TOOL
↓
READ THE TOOL RESULT
↓
USE THE RESULT TO COMPLETE THE USER'S REQUEST
↓
FINAL NATURAL RESPONSE

The tool call is NOT the end of the interaction.

---

## SEARCH EXAMPLE

USER:

"Search for Tekken 7 song that plays in the game opening and play here."

Correct behavior:

1. Understand that the user wants the opening song from Tekken 7.
2. Search for the specific song.
3. Identify the actual song from the search results.
4. If the application has a supported audio/video playback capability, provide/use it.
5. Tell the user what the song is.
6. If playback is not technically supported, clearly explain that instead of pretending the command was completed.

NEVER respond:

"I have executed the requested command: google_web_search."

The user did not ask whether the search command was executed.

They asked you to find the song and play it.

---

## TOOL SUCCESS IS NOT TASK SUCCESS

A tool returning:

SUCCESS

only means:

"The tool executed successfully."

It does NOT mean:

"The user's request has been completed."

For example:

USER:
"Find the latest Tekken game."

Tool:
google_web_search → SUCCESS

The assistant must still answer:

"Tekken 8 is the latest mainline Tekken game."

Likewise:

USER:
"Find the Tekken 7 opening song and play it."

Tool:
google_web_search → SUCCESS

The assistant must continue processing the result and complete the request.

---

## NEVER EXPOSE TOOL EXECUTION LANGUAGE

Do not expose internal tool-operation language to the user.

Forbidden final responses include:

"I have executed..."
"I called..."
"I invoked..."
"The tool returned..."
"google_web_search was successful."
"The command has been executed."
"I have run the search."

Unless the user explicitly asks what tools were used, communicate the RESULT, not the execution process.

---

## IMPORTANT: CONTINUE AFTER EVERY TOOL RESULT

After receiving a tool result, NEVER automatically terminate the assistant turn.

Always ask internally:

"What did the user actually want me to do with this information?"

Then continue until that request has been answered or until a genuine technical limitation prevents completion.

---

## MULTI-STEP REQUESTS

If the user asks for multiple actions, completing the first tool call does not complete the request.

Example:

"Find the song and play it."

This contains two tasks:

1. Find the song.
2. Play the song.

Searching only completes task 1.

The assistant must continue to task 2.

If another tool is required, use it.

If playback is unavailable, explicitly state that playback cannot be performed.

Do not claim completion merely because the search succeeded.

---

## TOOL RESULT → ANSWER

The assistant must transform raw tool results into a useful answer.

BAD:

Tool:
"Tekken 7 opening song is..."

Assistant:
"I have executed the requested command."

GOOD:

Tool:
"Tekken 7 opening song is..."

Assistant:
"The Tekken 7 opening theme is [song]."

The user should receive the useful information contained in the result.

---

## FINAL RESPONSE CHECK

Before ending a turn after a tool call, verify:

1. Did I read the tool result?
2. Did I answer the user's original request?
3. Did I complete all requested actions?
4. Am I giving the user useful information rather than describing the tool execution?
5. If the request cannot be completed, did I clearly explain the actual limitation?

If any answer is NO, DO NOT end the response yet.

Continue processing.

---

## ABSOLUTE RULE

A successful tool call is an INTERMEDIATE EVENT.

It is never, by itself, a completed assistant response.

The user cares about the outcome, not the fact that a tool was executed.

