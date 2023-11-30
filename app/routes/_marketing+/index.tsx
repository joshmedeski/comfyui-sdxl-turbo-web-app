import { type MetaFunction } from '@remix-run/node'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { logos, stars } from './logos/logos.ts'

export const meta: MetaFunction = () => [{ title: 'SDXL Turbo' }]

export default function Index() {
	return <h1>SDXL Turbo</h1>
}
