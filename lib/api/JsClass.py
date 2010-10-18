#
# JavaScript Tools
# Copyright 2010 Sebastian Werner
#

import os, logging, copy, binascii, string

from js.Dependencies import collect
from js.parser.Parser import parse
from js.Compressor import compress

# Permutation support
from js.optimizer.ValuePatch import patch
from js.optimizer.DeadCode import optimize

# Post optimization
import js.optimizer.CombineDeclarations
import js.optimizer.LocalVariables
import js.optimizer.CryptPrivates
import js.optimizer.BlockReducer

allIds = {}


class JsClass():
    def __init__(self, path, rel, project):
        self.__project = project
        self.__cache = project.cache
        self.__mtime = os.stat(path).st_mtime

        self.path = path
        self.rel = os.path.splitext(rel)[0]
        self.name = self.rel.replace("/", ".")
        self.id = self.getId()


    def __baseEncode(self, num, alphabet=string.ascii_letters+string.digits):
        if (num == 0):
            return alphabet[0]
        arr = []
        base = len(alphabet)
        while num:
            rem = num % base
            num = num // base
            arr.append(alphabet[rem])
        arr.reverse()
        return "".join(arr)


    def getName(self):
        return self.name
        
    def getModificationTime(self):
        return self.__mtime

    def getText(self):
        return open(self.path, mode="r", encoding="utf-8").read()
        
    def getId(self):
        field = "id[%s]" % self.rel
        classId = self.__cache.read(field)
        if classId == None:
            numericId = binascii.crc32(self.rel.encode("utf-8"))
            classId = self.__baseEncode(numericId)
            
            self.__cache.store(field, classId, self.__mtime)
            
        if classId in allIds:
            logging.error("Oops: Conflict in class IDs between: %s <=> %s" % (allIds[classId], self.rel))
            
        allIds[classId] = self.rel
        return classId

    def getTree(self, permutation=None, optimization=None):
        field = "tree[%s]" % self.rel
        tree = self.__cache.read(field, self.__mtime)
        if tree == None:
            tree = parse(self.getText(), self.rel)
            self.__cache.store(field, tree, self.__mtime)
            
        if permutation or optimization:
            tree = copy.deepcopy(self.getTree())
            
            if permutation:
                patch(tree, permutation)
                optimize(tree)

            if optimization:
                if "privates" in optimization:
                    CryptPrivates.optimize(tree, self.id)
                
                if "variables" in optimization:
                    LocalVariables.optimize(tree)

                if "blocks" in optimization:
                    BlockReducer.optimize(tree)
                    
                if "declarations" in optimization:
                    CombineDeclarations.optimize(tree)
                
                if "x-strings" in optimization:
                    # Strings.optimize(tree)
                    pass
            
            
        return tree

    def getDependencies(self, permutation=None):
        field = "deps[%s]-%s" % (self.rel, permutation)
        deps = self.__cache.read(field, self.__mtime)
        if deps == None:
            deps, breaks = collect(self.getTree(permutation), self.getName())
            self.__cache.store(field, deps, self.__mtime)
            
            field = "breaks[%s]-%s" % (self.rel, permutation)
            self.__cache.store(field, breaks, self.__mtime)
        
        return deps
            
    def getBreakDependencies(self, permutation=None):
        field = "breaks[%s]-%s" % (self.rel, permutation)
        breaks = self.__cache.read(field, self.__mtime)
        if breaks == None:
            self.getDependencies(permutation)
            breaks = self.__cache.read(field, self.__mtime)
            
        return breaks
        
    def getCompressed(self, permutation=None, optimization=None):
        field = "compressed[%s]-%s" % (self.rel, permutation)
        compressed = self.__cache.read(field, self.__mtime)
        if compressed == None:
            tree = self.getTree(permutation, optimization)
            compressed = compress(tree)
            self.__cache.store(field, compressed, self.__mtime)
            
        return compressed
            
    def __str__(self):
        return self.name

    def __repr__(self):
        return self.name
        
        