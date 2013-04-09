module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/** <%= pkg.name %>.js v<%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd hh:mm") %> http://github.com/danielmendel/glitz.js/license.txt **/\n'
      },
      build: {
        files: {
            '<%= pkg.name %>.min.js': ['<%= pkg.name %>.js']
        }
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('default', ['uglify']);

};