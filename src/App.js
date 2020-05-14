import * as PIXI from 'pixi.js'
import { lerp, map } from './inc/utils'
import { gsap } from 'gsap'
import CSSRulePlugin from 'gsap/CSSRulePlugin'
import Datas from './Datas'
import Slider from './slider/Slider'
import Conf from './conf'
import Store from './Store'
import MouseTrail from './fx/mouseTrail'
import Gomme from './slider/Gomme'
import './styles/styles.scss'
import './styles/ui.scss'

// Register gsap plugins
gsap.registerPlugin(CSSRulePlugin)

let _w = window.innerWidth
let _h = window.innerHeight

/**
 * Variables
 */
const debug = false
const { colors } = Conf

/**
 * Pixi App
 */

const app = new PIXI.Application({
	resolution: window.devicePixelRatio,
	width: _w,
	height: _h,
	backgroundColor: colors.bluedark,
	// autoDensity: true,
	antialias: true,
})
app.renderer.plugins.interaction.moveWhenInside = true
export default app

/*------------------------------------------------------------------------*/
const { stage, renderer } = app
const brushUrl = 'assets/brush_eraser_bruit.png'
const fontSilk = 'assets/fonts/SilkSerif-Regular.woff'

app.loader
	.add(brushUrl, { crossOrigin: 'anonymous' })
	// .add(fontSilk, { crossOrigin: 'anonymous' })
	.on('progress', handleOnProgress)
	.load(setup)

/**
 * SETUP
 * @param {*} loader
 * @param {*} resources
 */
function setup(loader, resources) {
	//------------------------------------------------------------------------
	const brushTexture = resources[brushUrl].texture
	const brushSprite = new PIXI.Sprite(brushTexture)
	brushSprite.scale.set(0.8)
	brushSprite.alpha = 0.4
	brushSprite.anchor.set(0.5)
	// Create Slider
	//------------------------------------------------------------------------
	const slider = new Slider(Datas.slides, brushSprite)
	const slides = slider.slides
	const nbSlides = slides.length
	// Mouse Fx
	Store.mouseTrailFx = new MouseTrail()
	// Gomme Sprite
	const gomme = new Gomme()

	/**
	 * USER LISTENERS
	 */
	app.stage.interactive = true
	app.stage.on('pointermove', pointerMove)
	app.stage.on('pointerdown', pointerDown)
	app.stage.on('pointerup', pointerUp)

	function pointerMove(event) {
		// Mouse Fx
		Store.dragging === true && Store.mouseTrailFx.update()
	}
	function pointerDown(event) {
		Store.dragging = true
		Store.mouseTrailFx.init()
		gomme.down()
	}

	function pointerUp(event) {
		Store.dragging = false
		const currentSlide = slides[Store.activeSlider]
		// On calcule les mots qu'on efface sure le slide actuel
		progressWordGetErased(currentSlide)
		Store.mouseTrailFx.onMouseUp()

		gomme.up()
	}

	/**
	 * MAIN LOOP
	 */
	app.ticker.add((delta) => {
		// Gomme
		gomme.update()
	})
}

function progressWordGetErased(currentSlide) {
	const erasedContents = currentSlide.erasedWordsObj // array
	// on stock les ErasedContent supprimé et si tous supprimé on lance l'action
	let nbErasedComplete = 0

	for (let i = 0; i < erasedContents.length; i++) {
		// Récupération du pourcentage de pixel noirs
		const currentRenderTexture = erasedContents[i].rdTexture
		const pourcent = getBlackPixelPourcent(currentRenderTexture)
		if (pourcent > 65 && !erasedContents[i].isErased) {
			// le bloc de texte est effacé
			erasedContents[i].onErasedComplete()
			// si plusieurs bloc Textes on réarrange tous les textes
			if (erasedContents.length > 1) {
				currentSlide.rearangeTextBlock()
			}
		}
		erasedContents[i].isErased && nbErasedComplete++
	}
	// dés que le/les texte-s est effacé à plus de 70% on déclenche l'action de suite
	if (
		nbErasedComplete === erasedContents.length &&
		currentSlide.isComplete === false
	) {
		currentSlide.isComplete = true
		eraserComplete(currentSlide)
	}
}

function handleOnProgress(loader, resources) {
	console.log(loader.progress + '% loaded')
}

/*-----------------------------------------------------------------------*/
function eraserComplete(currentSlide) {
	// 1. Efface le reste du texte si phrase seul // si multi texte on laisse le texte visible
	// 2. Affichage du bouton dans le container UI
	// CSSRulePlugin
	// Bouton CTA Style
	let rule = CSSRulePlugin.getRule('.cta-slider:before') //get the rule
	gsap.to(rule, {
		duration: 0.5,
		cssRule: {
			width: '80%',
		},
	})

	// BOUTON
	let btnTop = '38vh'
	let btnTopTarget = '43vh'

	const textGroup = currentSlide.textGroup
	const targetY = textGroup.y - 50
	// si le slide est un seul grand block texte alors on le fadeout
	if (!currentSlide.isMultiText) {
		// Text pixi gsap
		gsap.to(textGroup, {
			alpha: 0,
			duration: 1,
			y: targetY,
		})
	} else {
		// Si c'est c'est un texte multiple alors on le déplace vers le haut
		// Text pixi gsap
		gsap.to(textGroup, {
			y: textGroup.y - 50,
			duration: 3,
		})
		// Bouton Offset
		btnTop = '85vh'
		btnTopTarget = '80vh'
	}

	currentSlide.btn.style.display = 'block'
	gsap.fromTo(
		currentSlide.btn,
		{
			opacity: 0,
			top: btnTop,
		},
		{
			opacity: 1,
			top: btnTopTarget,
			duration: 1,
		}
	)
	// INFOBULLE
	if (currentSlide.infoBulle) {
		currentSlide.infoBulle.classList.add('active')
	}
}

/**
 * Get Eraser Progression as pourcents
 *
 *	> rawPixelArray ,  1 pixel = 4 item d'un array : R | V | B | A
 *	> nb Pixels = rawPixelArray / 4
 *	le rendu est en niveau de gris donc systèmatiquement R = V = B
 *	donc on peut vérifier uniquement le R pour le niveau de densité du noir
 *	je décide de qu'une valeur R < 75 nous donne un noir assez profond pour
 *  sélectionner ce pixel comme critère de notre caclu de pourcentage
 *	Je n'ai pas besoin de regarder précisément chaque pixel mais chaque 10 pixels
 * 	donc :
 *		1 : créer un tableau avec chaque 30 pixels soit chaque 40*3 value du tableau
 *		2 : compter le nombre de value < 75
 *		3 : calcul du pourcentage
 * @param {*} renderTexture
 */
function getBlackPixelPourcent(renderTexture) {
	const rawPixelArray = renderer.plugins.extract.pixels(renderTexture)
	const newArray = rawPixelArray.filter(function (value, index, ar) {
		return index % 120 == 0
	})
	// On compte tout ceux en dessous de 75
	const filter = (fn, array) =>
		array.reduce(
			(acc, currentItem) => (fn(currentItem) ? acc.concat(currentItem) : acc),
			[]
		)
	const lowerThan75 = (x) => x < 75
	const nbBlackPixel = filter(lowerThan75, newArray).length
	const pourcent = (nbBlackPixel * 100) / newArray.length

	return pourcent
}

function getImageFrom(renderTexture) {
	const image = renderer.plugins.extract.image(renderTexture)
	return image
}

/**
 * RESIZE
 */
window.addEventListener('resize', () => {
	_w = window.innerWidth
	_h = window.innerHeight
	renderer.resize(_w, _h)
})
