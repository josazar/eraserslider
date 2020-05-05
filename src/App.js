import * as PIXI from 'pixi.js'
import { lerp, map } from './inc/utils'
import { gsap } from 'gsap'
import Datas from './Datas'
import Slider from './slider/Slider'
import Conf from './conf'
import Store from './Store'

import './styles/styles.scss'
import './styles/ui.scss'

let _w = window.innerWidth
let _h = window.innerHeight

/**
 * Variables
 */
const debug = false
const { colors } = Conf
const uiDiv = document.getElementById('UI')

/**
 * Pixi App
 */
console.log('App')

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
	/**
	 * USER LISTENERS
	 */
	app.stage.interactive = true
	app.stage.on('pointerdown', pointerDown)
	app.stage.on('pointerup', pointerUp)

	function pointerDown(event) {
		Store.dragging = true
	}

	function pointerUp(event) {
		Store.dragging = false
		const currentSlide = slides[Store.activeSlider]
		// On calcule les mots qu'on efface sure le slide actuel
		progressWordGetErased(currentSlide)
	}
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
			if (erasedContents.length > 1) currentSlide.rearangeTextBlock()
		}
		erasedContents[i].isErased && nbErasedComplete++
	}
	// dés que le/les texte-s est effacé à plus de 70% on déclenche l'action de suite
	nbErasedComplete === erasedContents.length && eraserComplete(currentSlide)
}

function handleOnProgress(loader, resources) {
	console.log(loader.progress + '% loaded')
}

/*-----------------------------------------------------------------------*/
function eraserComplete(currentSlide) {
	// 1. Affichage du bouton dans le container UI
	// 2. Efface le reste du texte si phrase seul // si multi texte on laisse le texte visible

	let btn = document.getElementById('EraserCompleteBtn')
	if (!uiDiv.contains(btn)) {
		btn = document.createElement('a')
		btn.setAttribute('class', 'btn align-center vertical-center ')
		btn.setAttribute('id', 'EraserCompleteBtn')
		btn.setAttribute('href', '#')
		btn.innerHTML = 'Découvrir mes services'
		uiDiv.appendChild(btn)
	}
	// GSAP  animation
	gsap.fromTo(
		btn,
		{
			opacity: 0,
			top: '80vh',
		},
		{
			opacity: 1,
			top: '75vh',
			duration: 1,
		}
	)
	if (!currentSlide.isMultiText) {
		const textGroup = currentSlide.textGroup
		const targetY = textGroup.y - 50
		// Text pixi gsap
		gsap.to(textGroup, {
			alpha: 0,
			duration: 1,
			y: targetY,
		})
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
