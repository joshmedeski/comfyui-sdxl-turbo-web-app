import {
	type ActionFunctionArgs,
	json,
	type MetaFunction,
} from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import axios from 'axios'
import WebSocket from 'ws'

export const meta: MetaFunction = () => [{ title: 'SDXL Turbo' }]

const comfyUiPrompt = (positivePrompt: string) => {
	return {
		'5': {
			inputs: {
				width: 512,
				height: 512,
				batch_size: 1,
			},
			class_type: 'EmptyLatentImage',
		},
		'6': {
			inputs: {
				text: positivePrompt,
				clip: ['20', 1],
			},
			class_type: 'CLIPTextEncode',
		},
		'7': {
			inputs: {
				text: 'text, watermark',
				clip: ['20', 1],
			},
			class_type: 'CLIPTextEncode',
		},
		'8': {
			inputs: {
				samples: ['13', 0],
				vae: ['20', 2],
			},
			class_type: 'VAEDecode',
		},
		'13': {
			inputs: {
				add_noise: true,
				noise_seed: 0,
				cfg: 1,
				model: ['20', 0],
				positive: ['6', 0],
				negative: ['7', 0],
				sampler: ['14', 0],
				sigmas: ['22', 0],
				latent_image: ['5', 0],
			},
			class_type: 'SamplerCustom',
		},
		'14': {
			inputs: {
				sampler_name: 'euler_ancestral',
			},
			class_type: 'KSamplerSelect',
		},
		'20': {
			inputs: {
				ckpt_name: 'xl turbo 1.0 fp16.safetensors',
			},
			class_type: 'CheckpointLoaderSimple',
		},
		'22': {
			inputs: {
				steps: 1,
				model: ['20', 0],
			},
			class_type: 'SDTurboScheduler',
		},
		'27': {
			inputs: {
				images: ['8', 0],
			},
			class_type: 'PreviewImage',
		},
	} as const
}

function listenToWebSocket(socket: WebSocket) {
	return new Promise((resolve, reject) => {
		socket.addEventListener('message', (event: any) => {
			if (typeof event.data === 'string') {
				console.log('data', JSON.parse(event.data)?.data)
				console.log('status', event.data?.status)
				const remaining = JSON.parse(event.data)?.data?.status?.exec_info
					?.queue_remaining
				if (remaining === 0) {
					resolve(event.data)
				}
			}
		})

		socket.addEventListener('error', error => {
			// Reject the promise with the error
			console.error('errors', error)
			reject(error)
		})

		socket.addEventListener('close', () => {
			// Reject the promise if the connection is closed without receiving any messages
			reject(new Error('WebSocket connection closed.'))
		})
	})
}

export async function action({ request }: ActionFunctionArgs) {
	try {
		const formData = await request.formData()
		const prompt = String(formData.get('prompt'))
		const promptResponse = await axios.post('http://127.0.0.1:8188/prompt', {
			prompt: comfyUiPrompt(prompt),
		})
		const promptId = promptResponse.data.prompt_id

		const clientId = 'asldkfjelkfmcxnjkjd'
		const socket = new WebSocket(`ws://127.0.0.1:8188/ws?clientId=${clientId}`)
		await listenToWebSocket(socket)

		const historyResponse = await axios.get(
			`http://127.0.0.1:8188/history/${promptId}`,
		)
		const historyImage = historyResponse.data[promptId].outputs['27'].images[0]
		const viewResponse = await axios.get(`http://127.0.0.1:8188/view`, {
			params: historyImage,
			responseType: 'arraybuffer',
		})
		const image = Buffer.from(viewResponse.data, 'binary').toString('base64')
		return json({ image })
	} catch (error) {
		console.error(error)
		return json({ image: '' })
	}
}

export default function Index() {
	const data = useActionData<typeof action>()

	return (
		<main className="flex h-full flex-col justify-center">
			<section className="mx-auto w-full max-w-4xl space-y-4">
				<div>
					{data?.image ? (
						<img
							src={`data:image/png;base64,${data?.image}`}
							width={512}
							height={512}
							alt="SDXL Turbo output"
						/>
					) : (
						<div className="h-[512px] w-[512px] dark:bg-gray-950"></div>
					)}
				</div>
				<Form method="post">
					<input
						name="prompt"
						className="w-full rounded-sm px-4 py-2 text-lg dark:bg-black"
					/>
				</Form>
			</section>
		</main>
	)
}
