REPORTER = spec

test: 
	mocha \
		--reporter $(REPORTER) \
		test/acceptance/*.js \
		test/*.js
		
.PHONY: test