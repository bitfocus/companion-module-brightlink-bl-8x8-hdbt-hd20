import { combineRgb } from '@companion-module/base'
import { ANY_INPUT, FIELDS } from './fields.js'
import { outputHasDisplay } from './matrix.js'

const toId = (value) => {
	const parsed = parseInt(value, 10)
	return Number.isNaN(parsed) ? null : parsed
}

const routedInput = (self, outputId) => self.matrixStatus?.HDMI_OUT?.[outputId - 1]?.input ?? null

const AUDIO_OUTPUT_KEYS = ['iis', 'spdif']

export function getFeedbackDefinitions(self) {
	return {
		connected: {
			type: 'boolean',
			name: 'Matrix is connected',
			description: 'True while status polls succeed. Invert it for an offline warning.',
			options: [],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 128, 0),
			},
			callback: () => self.connected,
		},

		routing_matches: {
			type: 'boolean',
			name: 'Routing matches (all outputs)',
			// The matrix does not report which scene is active, and its stored scenes
			// cannot be read back, so this stands in for a "current scene" indicator.
			description:
				'True when every checked output is fed by the chosen input. Pair it with "Map IO path - multi" to light the button whose map is live.',
			options: self.matrixStatus.HDMI_OUT.map((output) => FIELDS.RouteMatchSelect(self, output)),
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			callback: (feedback) =>
				self.matrixStatus.HDMI_OUT.every((output) => {
					const expected = toId(feedback.options[output.id])
					return expected === ANY_INPUT || expected === output.input
				}),
			// Outputs set to "Any" stay unchecked so a partial map survives a re-learn.
			learn: (feedback) => {
				if (!self.connected) return undefined
				const learned = {}
				for (const output of self.matrixStatus.HDMI_OUT) {
					if (toId(feedback.options[output.id]) !== ANY_INPUT) learned[output.id] = output.input
				}
				return learned
			},
		},

		selected: {
			type: 'boolean',
			name: 'Specified input is the selected input',
			description: 'Highlights the input currently held by the "Select input" action',
			options: [FIELDS.InputSelect(self)],
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: (feedback) => self.selectedInput !== null && self.selectedInput === toId(feedback.options.input),
		},

		output: {
			type: 'boolean',
			name: 'Selected input is routed to output',
			description: 'Highlights outputs already fed by the selected input',
			options: [FIELDS.OutputSelect(self)],
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			callback: (feedback) => {
				const output = toId(feedback.options.output)
				if (output === null || self.selectedInput === null) return false
				return routedInput(self, output) === self.selectedInput
			},
		},

		input_output: {
			type: 'boolean',
			name: 'Specified input is routed to specified output',
			description: 'Highlights a fixed input-to-output route regardless of the current selection',
			options: [FIELDS.InputSelect(self), FIELDS.OutputSelect(self)],
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			callback: (feedback) => {
				const input = toId(feedback.options.input)
				const output = toId(feedback.options.output)
				if (input === null || output === null) return false
				return routedInput(self, output) === input
			},
			learn: (feedback) => {
				const input = routedInput(self, toId(feedback.options.output))
				return self.connected && input !== null ? { input } : undefined
			},
		},

		input_routed: {
			type: 'boolean',
			name: 'Input is routed to any output',
			description: 'True when at least one output is fed by the input',
			options: [FIELDS.InputSelect(self)],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: (feedback) => {
				const input = toId(feedback.options.input)
				return input !== null && self.matrixStatus.HDMI_OUT.some((output) => output.input === input)
			},
		},

		input_audio: {
			type: 'boolean',
			name: 'Input audio source is',
			options: [FIELDS.InputSelect(self), FIELDS.AudioSource],
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(255, 255, 0),
			},
			callback: (feedback) => {
				const input = self.matrixStatus.HDMI_IN[toId(feedback.options.input) - 1]
				return input !== undefined && input.audio === toId(feedback.options.audioSource)
			},
		},

		output_audio: {
			type: 'boolean',
			name: 'Output audio output is enabled',
			description: 'True when the analog/I²S or S/PDIF output of the chosen output is switched on',
			options: [FIELDS.OutputSelect(self), FIELDS.AudioOutput],
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(255, 255, 0),
			},
			callback: (feedback) => {
				const output = self.matrixStatus.HDMI_OUT[toId(feedback.options.output) - 1]
				const key = feedback.options.audioOutput
				return output !== undefined && AUDIO_OUTPUT_KEYS.includes(key) && output[key] === 1
			},
		},

		input_edid: {
			type: 'boolean',
			name: 'Input EDID assignment is',
			options: [FIELDS.InputSelect(self), FIELDS.EdidMode, FIELDS.EdidSlot],
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 255),
			},
			callback: (feedback) => {
				const input = self.matrixStatus.HDMI_IN[toId(feedback.options.input) - 1]
				return (
					input !== undefined &&
					input.edidMode === toId(feedback.options.edidMode) &&
					input.edidSlot === toId(feedback.options.edidSlot)
				)
			},
		},

		input_signal: {
			type: 'boolean',
			name: 'Input has a source connected',
			// pw5v reads 1 on every port on this hardware, so sig is the only usable test.
			description: 'True when the input reports sig=1 — a source is connected and sending video',
			options: [FIELDS.InputSelect(self)],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 128, 0),
			},
			callback: (feedback) => {
				const input = toId(feedback.options.input)
				return input !== null && Boolean(self.matrixStatus?.HDMI_IN?.[input - 1]?.hasSource)
			},
		},

		output_display: {
			type: 'boolean',
			name: 'Output has a display connected',
			// Output sig reads 0 on plenty of ports that are driving a display, so the
			// test is hpd, ORed with the EDID readback.
			description: 'True when the output reports hpd=1 or reads back an EDID other than "Unplug"',
			options: [FIELDS.OutputSelect(self), FIELDS.OutputHalf],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 128, 0),
			},
			callback: (feedback) => {
				const output = toId(feedback.options.output)
				if (output === null) return false
				switch (feedback.options.half) {
					case 'hdmi':
						return Boolean(self.matrixStatus?.HDMI_OUT?.[output - 1]?.hasDisplay)
					case 'hdbt':
						return Boolean(self.matrixStatus?.HDBT_OUT?.[output - 1]?.hasDisplay)
					default:
						return outputHasDisplay(self.matrixStatus, output)
				}
			},
		},
	}
}
