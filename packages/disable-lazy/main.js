import Astro from 'meteor/jagi:astronomy'

Object.keys(Astro).forEach(key => {
	Package['jagi:astronomy'][key] = Astro[key]
})
