#!/usr/bin/env python3

# Extend PYTHONPATH with 'lib'
import sys, os, traceback
sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), os.pardir, "lib")))

# Import JavaScript tooling
from js import *

# Open Session
session = Session()

# Protect session
try:
    # Application specific code
    session.addProject(Project("../../qooxdoo/qooxdoo/framework"))
    session.addProject(Project("../../qooxdoo/qooxdoo/component/apiviewer"))
    session.addProject(Project("../../unify/framework"))

    # Locale data
    session.addLocale("en_US")

    # Variant data
    session.addVariant("qx.debug", [ '"on"' ])
    session.addVariant("qx.client", [ '"gecko"' ])
    session.addVariant("qx.dynlocale", [ '"off"' ])
    session.addVariant("qx.globalErrorHandling", [ '"off"' ])
    session.addVariant("qx.version", ["1.0"])
    session.addVariant("qx.theme", ['"apiviewer.Theme"'])

    # Create optimizer for improved speed/compression
    optimization = Optimization(["unused", "privates", "variables", "declarations", "blocks"])
    
    # Process every possible permutation
    for permutation in session.getPermutations():
        logging.info("PERMUTATION: %s" % permutation)
        
        # Build file header
        header = ""
        header += "/*\n"
        header += " * Copyright 2010\n"
        header += " *\n"
        header += " * Permutation: %s\n" % permutation
        header += " * Optimizations: %s\n" % optimization
        header += " */\n\n"
    
        # Resolving dependencies
        resolver = Resolver(session, permutation)
        resolver.addClassName("apiviewer.Application")
        resolver.addClassName("apiviewer.Theme")
        classes = resolver.getIncludedClasses()

        # Collecting Resources
        resources = Resources(session, classes, permutation)

        # Compiling classes
        sorter = Sorter(resolver, permutation)
        compressor = Compressor(sorter.getSortedClasses(), permutation, optimization)

        # Combining result
        buildCode = header + resources.export() + compressor.compress() + "qx.core.Init.boot(apiviewer.Application);"

        # Create filename
        # Based on permutation.getKey(), optimization, modification date, etc.
        outfileName = "build.js"

        # Write file
        outfile = open(outfileName, mode="w", encoding="utf-8")
        outfile.write(buildCode)
        outfile.close()

except BaseException as ex:
    logging.error(ex)
    traceback.print_exc()

# Close session
session.close()
