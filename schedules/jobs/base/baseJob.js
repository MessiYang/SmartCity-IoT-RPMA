function Base() {

}

function Base(id, name, func) {
  this.id = id;
  this.name = name;
  this.func = func;
}

Base.prototype.setId = function(id) {
  this.id = id;
}

Base.prototype.setName = function(name) {
  this.name = name;
}

Base.prototype.setFunc = function(func) {
  this.func = func;
}

Base.prototype.toString = function() {
  return `[Job name=${this.name}, id=${this.id}]`;
}

module.exports = Base;
