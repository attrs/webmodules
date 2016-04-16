'use strict';

const path = require('path');
const gulp = require('gulp');
const gutil = require('gulp-util');
const rename = require("gulp-rename");
const uglify = require('gulp-uglify');
const rimraf = require('gulp-rimraf');

const dist = path.join(__dirname);

gulp.task('build.js.clean', () => {
  return gulp.src('runtime.min.js', { read: false })
    .pipe(rimraf());
});

gulp.task('build', ['build.js.clean'], () => {
  return gulp.src('runtime.js')
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest(dist));
});

// conclusion
gulp.task('watch', ['build.watch']);
gulp.task('default', ['build']);
