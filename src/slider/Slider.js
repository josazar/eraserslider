import TextSlide from './TextSlide'
import Store from '../Store'
import { gsap } from 'gsap'
import app from '../App'
import { filters } from 'pixi.js'

class Slider {
	constructor(datas, brushSprite) {
		this.datas = datas
		this.rootApp = app
		this.slides = this.createSlides(brushSprite)
		// Fx
		this.blurFilter = new filters.BlurFilter()
		this.blurFilter.blur = 0
		this.slides.forEach((element) => {
			element.textGroup.filters = [this.blurFilter]
		})
		// positionnement des slides
		for (const slide of this.datas) {
			this.setSlidePos(slide.id)
		}
		this.createNavigation()
		// onResize Listener
		window.addEventListener('resize', () => this.onResize())
		this.introAnimation()
	}

	introAnimation() {
		// Init animation intro
		// init blur effect
		gsap.fromTo(
			this.blurFilter,
			{
				blur: 20,
			},
			{
				blur: 0,
				duration: 2,
			}
		)
		const textGroup = this.slides[0].textGroup
		gsap.fromTo(
			textGroup,
			{
				y: textGroup.y + 70,
			},
			{
				y: textGroup.y,
				duration: 2,
			}
		)
	}
	createSlides(brushSprite) {
		const slides = []
		for (const slide of this.datas) {
			const item = new TextSlide(slide, brushSprite)
			slides.push(item)
		}
		return slides
	}
	createNavigation() {
		let sliderContainerUI = this.createDivWithClass('slider-container-ui')
		let uiContainer = document.getElementById('UI')
		let nextButton = this.createDivWithClass('nextButton')
		let prevButton = this.createDivWithClass('prevButton')
		uiContainer.appendChild(sliderContainerUI)
		sliderContainerUI.appendChild(nextButton)
		sliderContainerUI.appendChild(prevButton)

		// Mouse Listener
		nextButton.addEventListener('mousedown', () => this.nextSlide())
		prevButton.addEventListener('mousedown', () => this.prevSlide())
	}
	nextSlide() {
		if (Store.activeSlider < this.slides.length - 1)
			this.goToItem(Store.activeSlider + 1, 'next')
	}
	prevSlide() {
		if (Store.activeSlider > 0) this.goToItem(Store.activeSlider - 1, 'prev')
	}
	/**
	 * Déplace le slider vers l'item ciblé
	 */
	goToItem(numSlide, direction) {
		const currentSlide = this.slides[Store.activeSlider]
		const targetSlide = this.slides[numSlide]
		switch (direction) {
			case 'prev':
				gsap.to(currentSlide.slideContainer, {
					x: window.innerWidth,
				})
				gsap.fromTo(
					targetSlide.slideContainer,
					{
						x: -100,
					},
					{
						x: 0,
					}
				)
				break
			case 'next':
				gsap.to(currentSlide.slideContainer, {
					x: currentSlide.slideContainer.x - 200,
				})
				gsap.fromTo(
					targetSlide.slideContainer,
					{
						x: window.innerWidth,
					},
					{
						x: 0,
					}
				)
				break
			default:
				break
		}
		// BOUTON CTA & INFOBULLE
		if (currentSlide.isComplete) {
			currentSlide.btn.style.display = 'none'
			if (currentSlide.infoBulle)
				currentSlide.infoBulle.classList.remove('active')
		}
		if (targetSlide.isComplete) {
			targetSlide.btn.style.display = 'block'
			if (targetSlide.infoBulle) targetSlide.infoBulle.classList.add('active')
		}

		Store.activeSlider = numSlide
	}

	createDivWithClass(className) {
		let div = document.createElement('div')
		div.setAttribute('class', className)

		return div
	}
	setSlidePos(numSlide) {
		const slide = this.slides[numSlide]
		if (numSlide !== Store.activeSlider) {
			slide.slideContainer.x = window.innerWidth
		} else {
			slide.slideContainer.x = 0
		}
		slide.textGroup.x = window.innerWidth / 2 - slide.textGroup.width / 2
		slide.bg.width = window.innerWidth
	}
	onResize() {
		for (const slide of this.slides) {
			this.setSlidePos(slide.id)
		}
	}
}

export default Slider
