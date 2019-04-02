import Astro from 'meteor/jagi:astronomy'
import 'meteor/settlin:astronomy-softremove-behavior';
import 'meteor/settlin:astronomy-meta-behavior';

Object.keys(Astro).forEach(key => {
	Package['jagi:astronomy'][key] = Astro[key]
});
