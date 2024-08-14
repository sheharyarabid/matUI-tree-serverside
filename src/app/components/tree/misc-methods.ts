

// Method to add a new node to the tree
// findNode(node: TodoItemNode, nodeId: string): TodoItemNode[] {
//   if (node.id === parseInt(nodeId)) {
//     return [node];
//   }
//   if (node.children) {
//     for (const child of node.children) {
//       const foundNode = this.findNode(child, nodeId);
//       if (foundNode.length > 0) {
//         return foundNode;
//       }
//     }
//   }
//   return [];
// }


          // addNodeToTree(parentId: number | undefined, newNode: TodoItemNode) {
          //   const updateChildren = (nodes: TodoItemNode[]): boolean => {
          //     for (const node of nodes) {
          //       if (node.id === parentId) {
          //         node.children.push(newNode);
          //         // Ensure the parent node is marked as expandable
          //         node.expandable = true;
          //         this.dataSource.data = [...this.dataSource.data]; // Trigger update
          //         this.treeControl.expand(this.treeControl.dataNodes.find(n => n.id === parentId) || this.treeControl.dataNodes[0]);
          //         return true;
          //       }
          //       if (updateChildren(node.children)) {
          //         return true;
          //       }
          //     }
          //     return false;
          //   };
          
          //   // Update tree data
          //   updateChildren(this._database.data);
          // }
  // removeNodeFromTree(nodeId: TodoItemFlatNode) {
  //   const removeNode = (nodes: TodoItemNode[]): boolean => {
  //     for (const node of nodes) {
  //       const index = node.children.findIndex(child => child.id === Number(nodeId));
  //       if (index !== -1) {
  //         node.children.splice(index, 1);
  //         if (node.children.length === 0) {
  //           node.expandable = false;
  //         }
  //         this.dataSource.data = [...this.dataSource.data]; // Trigger update
  //         return true;
  //       }
  //       if (removeNode(node.children)) {
  //         return true;
  //       }
  //     }
  //     return false;
  //   };

  //   // Update tree data
  //   removeNode(this._database.data);
  // }


 // async getNodesByFilter(filterByKey) {
  //   // Step 1: Find nodes that match the filter key
  //   const nodes = await strapi.entityService.findMany('api::tree.tree', {
  //     filters: { node: { $contains: filterByKey } },
  //     populate: { children: true, parent: true } // Ensure children and parent are populated
  //   });
  
  //   console.log('Filtered Nodes:', nodes); // Debugging: log filtered nodes
  
  //   // Step 2: Collect all nodes to build the full hierarchy
  //   const allNodeIds = new Set(nodes.map(node => node.id));
  //   const ancestorsSet = new Set();
  
  //   // Recursive function to retrieve ancestors
  //   const retrieveAncestors = async (node) => {
  //     let currentNode = node;
  //     while (currentNode.parent) {
  //       const parent = await strapi.entityService.findOne('api::tree.tree', currentNode.parent.id, {
  //         populate: { children: true, parent: true }
  //       });
  //       if (!parent) {
  //         throw new Error('Ancestor not found');
  //       }
  //       if (!allNodeIds.has(parent.id)) {
  //         ancestorsSet.add(parent.id);
  //         await retrieveAncestors(parent);
  //       }
  //       currentNode = parent;
  //     }
  //   };
  
  //   // Retrieve ancestors for all nodes that match the filter
  //   await Promise.all(nodes.map(node => retrieveAncestors(node)));
  
  //   // Fetch all unique ancestor nodes
  //   const ancestors = await Promise.all(Array.from(ancestorsSet).map(id =>
  //     strapi.entityService.findOne('api::tree.tree', id, {
  //       populate: { children: true, parent: true }
  //     })
  //   ));
  
  //   console.log('Ancestors:', ancestors); // Debugging: log ancestors
  
  //   // Step 3: Build hierarchical structure
  //   const buildHierarchy = (nodes) => {
  //     const nodeMap = new Map();
  
  //     // Populate node map with nodes
  //     nodes.forEach(node => nodeMap.set(node.id, { ...node, children: [] }));
  
  //     // Helper function to build children recursively
  //     const buildChildren = (node) => {
  //       if (node.children) {
  //         node.children.forEach(child => {
  //           const childNode = nodeMap.get(child.id);
  //           if (childNode) {
  //             const childNodeWithChildren = {
  //               id: childNode.id,
  //               node: childNode.node,
  //               createdAt: childNode.createdAt,
  //               updatedAt: childNode.updatedAt,
  //               publishedAt: childNode.publishedAt,
  //               children: buildChildren(childNode)
  //             };
  //             node.children.push(childNodeWithChildren);
  //           }
  //         });
  //       }
  //       return node.children || [];
  //     };
  
  //     // Build hierarchy
  //     const rootNodes = [];
  //     nodeMap.forEach(node => {
  //       if (node.parent && node.parent.id) {
  //         const parent = nodeMap.get(node.parent.id);
  //         if (parent) {
  //           parent.children.push({
  //             id: node.id,
  //             node: node.node,
  //             createdAt: node.createdAt,
  //             updatedAt: node.updatedAt,
  //             publishedAt: node.publishedAt,
  //             parent: {
  //               node: parent.node,
  //               id: parent.id
  //             },
  //             children: buildChildren(node)
  //           });
  //         }
  //       } else {
  //         rootNodes.push({
  //           id: node.id,
  //           node: node.node,
  //           createdAt: node.createdAt,
  //           updatedAt: node.updatedAt,
  //           publishedAt: node.publishedAt,
  //           parent: {
  //             node: null,
  //             id: null
  //           },
  //           children: null
  //         });
  //       }
  //     });
  
  //     return rootNodes;
  //   };
  
  //   // Combine nodes and ancestors for hierarchical structure
  //   const allNodes = [...nodes, ...ancestors];
  //   const hierarchicalData = buildHierarchy(allNodes);
  
  //   console.log('Hierarchical Data:', hierarchicalData); // Debugging: log hierarchical data
  
  //   return { data: hierarchicalData };
  // },
  
  // async getAncestors(node) {
  //   const ancestors = [];
  //   let currentNode = node;
  //   while (currentNode.parent) {
  //     const parent = await strapi.entityService.findOne('api::tree.tree', currentNode.parent.id);
  //     if (!parent) {
  //       throw new Error('Ancestor not found');
  //     }
  //     ancestors.push(parent);
  //     currentNode = parent;
  //   }
  //   return ancestors;
  // }  

   // async filter(ctx) {
  //   try {
  //     const { key } = ctx.query;
  
  //     if (!key) {
  //       return ctx.badRequest('Missing required field: key');
  //     }
  
  //     // Fetch nodes and ancestors based on the key
  //     const { data } = await strapi.service('api::custom-api.custom-api').getNodesByFilter(key);
  
  //     // Return the hierarchical data
  //     return ctx.send({ data });
  //   } catch (error) {
  //     console.error('Error filtering data:', error);
  //     return ctx.internalServerError('An error occurred while filtering data.');
  //   }
  // }


//   FINAL REPLACED FILTER CONTROLLER METHOD
  // async filter(ctx) {
  //   try {
  //     // Extract filtering criteria from query parameters
      
  //     // let  parentId = null;
  //     let { filter, parentId} =  ctx.query;
      
  //     if(parentId) {
  //       const childNodes = await strapi.entityService.findMany('api::tree.tree', {
  //         filters: { parent: parentId },
  //         populate: { parent: true },
  //       });
  //       ctx.body = { nodes: childNodes };
  //       return;
  //       }
     
  //     // Construct the query options
  //     const queryOptions = {
  //       filters: {  parent:null } , // Filter nodes by the provided filter
  //       populate: { parent: true }, // Ensure the 'node' relation is populated
  //       ...(filter && { filters: { node: { $containsi: filter } } }), // Apply filter if provided
  //     };
  //     // Fetch the nodes data with parent relations populated
  //     const nodes = await strapi.entityService.findMany(
  //       "api::tree.tree",
  //       queryOptions
  //     );

     
  //     // Create a set to store all relevant nodes, including ancestors
  //     const allNodes = new Set();
  //     // Recursive function to gather all ancestor nodes
  //     const gatherAncestors = async (parent) => {
  //       if (parent && !allNodes.has(parent.id)) {
  //         allNodes.add(parent.id);
  //         if (parent.parent) {
  //           // Fetch parent node details
  //           const parentNode = await strapi.entityService.findOne(
  //             "api::tree.tree",
  //             parent.parent.id,
  //             { populate: { parent: true } } // Ensure parent relation is populated
  //           );
  //           if (parentNode) {
  //             await gatherAncestors(parentNode); // Recursively gather ancestors
  //           }
  //         }
  //       }
  //     };
  //     // Process each node to gather its ancestors
  //     await Promise.all(nodes.map((node) => gatherAncestors(node)));
  //     // Fetch all relevant nodes, including ancestors
  //     const allRelevantNodes = await strapi.entityService.findMany(
  //       "api::tree.tree",
  //       {
  //         filters: { id: { $in: Array.from(allNodes) } }, // Filter nodes by gathered IDs
  //         populate: { parent: true }, // Ensure all nodes' relations are populated
  //       }
  //     );
      
  //       const map = new Map();
  //     allRelevantNodes.forEach((node) => {
  //       map.set(node.id, { ...node, children: [] });
  //     });
  //     const tree = [];
  //     map.forEach((node) => {
  //       if (node.node) {
  //         // Assuming node.node represents the parent
  //         const parent = map.get(node.node.id);
  //         if (parent) {
  //           parent.children.push(node);
  //         }
  //       } else {
  //         tree.push(node);
  //       }
  //     });

  //     // Send the fetched nodes with their relations as response
  //     ctx.body = { nodes: allRelevantNodes };
  //   } catch (error) {
  //     strapi.log.error("Error fetching data:", error); // Log any error that occurs
  //     ctx.status = 500; // Set status code to 500 for server errors
  //     ctx.body = { error: "Failed to fetch data" }; // Send error response
  //   }
  // },