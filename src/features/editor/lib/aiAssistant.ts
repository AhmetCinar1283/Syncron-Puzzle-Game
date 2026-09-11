/** Pure helpers/constants for the AI assistant dialog (no React). */

/** Mechanic keys offered as checkboxes in the curriculum editor (display order). */
export const AVAILABLE_MECHANICS = [
  'conveyor_up', 'conveyor_down', 'conveyor_left', 'conveyor_right',
  'teleporter_in_A', 'teleporter_out_A', 'teleporter_in_B', 'teleporter_out_B',
  'trampoline_up', 'trampoline_down', 'trampoline_left', 'trampoline_right',
  'direction_toggle', 'direction_deflector', 'ice', 'power_node', 'conveyorPowerRequired',
  'initialBoxes', 'trailCollision', 'rooms', 'reversed'
];

/**
 * Strips a surrounding markdown code fence (```json ... ``` or ``` ... ```)
 * from pasted AI output. Input is expected to be already trimmed; returns the
 * input unchanged when there is no fence.
 */
export function stripJsonCodeFence(input: string): string {
  if (input.startsWith('```json')) {
    return input.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (input.startsWith('```')) {
    return input.replace(/^```/, '').replace(/```$/, '').trim();
  }
  return input;
}

