const fs = require('fsPromise');

/*
comment: the whole comment
meta: {
  range: lines
  filename: only
  lineno
  columnno
  path: absolute
  code: {
    
  }
}
kind: of what the comment is for
name: of what the comment is for
longname: as above but full
undocumented: if there is no comment
classdesc: description portion of comment
*/

exports.publish = async function(data, opts) {
  data().each(r => console.log(r));
};
