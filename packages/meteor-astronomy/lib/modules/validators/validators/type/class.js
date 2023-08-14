import Validator from '../../validator.js';
import AstroClass from '../../../../core/class.js';

Validator.create({
  name: 'class',
  parseParam(param) {
    if (!AstroClass.isParentOf(param)) {
      throw new TypeError(
        `Parameter for the "class" validator has to be an Astronomy class`
      );
    }
  },
  isValid({
    value,
    param: Class
  }) {
    return value instanceof Class;
  },
  resolveError({
    name,
    param: Class
  }) {
    let className = Class.getName();
    return `"${name}" has to be ${className}`;
  }
});