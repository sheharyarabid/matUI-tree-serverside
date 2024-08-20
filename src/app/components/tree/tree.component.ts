
import { Component, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlattener, MatTreeFlatDataSource, MatTreeModule } from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CdkTreeModule } from '@angular/cdk/tree';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';

export class TodoItemNode {
  children: TodoItemNode[] = [];
  item: string = '';
  id?: number; // Ensure ID is included
  expandable: boolean = true; // Add the 'expandable' property
  parent?: number;
  childrenLength?: number;
}

export class TodoItemFlatNode {
  item: string = '';
  level: number = 0;
  expandable: boolean = true;
  id?: number; // Ensure ID is included
  isAdding?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
  parent?: {
    id: number;
  };
}
const apiUrl = 'http://localhost:1337/api/tree';
@Injectable()
export class ChecklistDatabase {
  private filteredNodeCache = new Map<number, TodoItemNode[]>(); // Cache for filtered data
  private nodeCache = new Map<number, TodoItemNode[]>(); // Cache to store loaded child nodes
  dataChange = new BehaviorSubject<TodoItemNode[]>([]);
  constructor(private http: HttpClient) {
    this.initialize();
  }

  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }

  initialize() {
    this.http.get<any>(`${apiUrl}/getfilter/?parentId=`).subscribe(
      (response: any) => {
        try {
          // const data = this.mapNodes(response);
          // const data = response.nodes;
          const data = this.mapNodes(response.nodes);
          this.dataChange.next(data);
        } catch (error) {
          console.error('Error processing data:', error);
          this.dataChange.next([]);
        }
      },
      error => {
        console.error('Error fetching data:', error);
        this.dataChange.next([]);
      }
    );
  }
  getCachedOrFetchChildren(nodeId: number): Observable<TodoItemNode[]> {
    const cachedChildren = this.nodeCache.get(nodeId);
    if (cachedChildren) {
      return of(cachedChildren); // Return cached children as an Observable
    } else {
      return this.http.get<any>(`${apiUrl}/getfilter/?parentId=${nodeId}`).pipe(
        map(response => {
          const childNodes = this.mapNodes(response.nodes);
          this.nodeCache.set(nodeId, childNodes); // Cache the loaded children
          return childNodes;
        })
      );
    }
  }

  mapNodes(nodes: any[]): TodoItemNode[] {
    const convertToTodoItemNode = (node: any): TodoItemNode => {
      const todoItemNode = new TodoItemNode();
      todoItemNode.item = node.node;
      todoItemNode.parent = node.parent;
      todoItemNode.id = node.id; // Ensure ID is correctly mapped
      todoItemNode.children = (node.children || []).map(convertToTodoItemNode);
      todoItemNode.childrenLength = node.childrenLength;
      todoItemNode.expandable = node.childrenLength > 0;  // Set 'expandable' based on children length
      return todoItemNode;
    };

    return nodes.map(convertToTodoItemNode);
  }
}

@Component({
  selector: 'app-tree',
  templateUrl: 'tree.component.html',
  styleUrls: ['tree.component.scss'],
  providers: [ChecklistDatabase],
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatTreeModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    CdkTreeModule,
    ReactiveFormsModule,
    CommonModule,
    HttpClientModule,
    MatSelectModule
  ],
})
export class TreeComponent {
 
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>();
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>();
  selectedParent: TodoItemFlatNode | null = null;
  nodeInput: { [key: string | number]: string } = {}; // Store input values for each node
  treeControl: FlatTreeControl<TodoItemFlatNode>
  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;
  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */);
  editingNode: TodoItemFlatNode | null = null;
  selectedNode: TodoItemFlatNode | null = null;
  isInputFieldVisible: boolean = false;
  updatedParent!: TodoItemFlatNode;
  filterKey: string = '';
  validParents: any[] = [];

  mapNodes(nodes: any[]): TodoItemNode[] { //works diff for bth..
    const nodeMap = new Map<number, TodoItemNode>();
    // First pass: Create all nodes and map them by ID
    nodes.forEach(node => {
      const todoItemNode = new TodoItemNode();
      todoItemNode.item = node.node;
      todoItemNode.id = node.id;
      todoItemNode.parent = node.parent?.id; // Store the parent ID
      todoItemNode.childrenLength = node.childrenLength;
      todoItemNode.children = [];
      if (todoItemNode?.id) {
        nodeMap.set(todoItemNode.id, todoItemNode);
      }
    });

    // Second pass: Assign children to their parents
    nodeMap.forEach(node => {
      if (node.parent) {
        const parentNode = nodeMap.get(node.parent);
        if (parentNode) {
          parentNode.children.push(node);
        }
      }
    });

    // Return only root nodes (nodes without parents)
    return Array.from(nodeMap.values()).filter(node => !node.parent);
  }
  toggleInputField() {
    this.isInputFieldVisible = !this.isInputFieldVisible;
    this.nodeInput = {}; // Clear the input field when toggling
  }
  toggleExpand(isExpand: boolean, node: TodoItemFlatNode) {
    if (isExpand) {
      if (node) {
        let savenode = this.flatNodeMap.get(node) as TodoItemNode;
        if(savenode?.children.length > 0){
          return;
        }
        else {
          
          this.loadChildren(node);
        }
        // If expanding, fetch child nodes from cache or API
      }
    } else {
      // If collapsing, simply collapse the node
      this.treeControl.collapse(node);
    }
  }
  loadChildren(node: TodoItemFlatNode) {
    const nodeId = node.id;
    if (!nodeId) return;
  
    // Check if the node is part of the filtered data
    const filteredChildren = this._database['filteredNodeCache'].get(nodeId);
    if (filteredChildren) {
      const parentNode = this.flatNodeMap.get(node);
      if (parentNode) {
        parentNode.children = filteredChildren;
        parentNode.expandable = filteredChildren.length > 0;
  
        this._database.dataChange.next(this._database.data); // Trigger change detection
        this.treeControl.expand(node); // Expand the node to show the children
      }
    } else {
      // If not filtered, use pagination
      this._database.getCachedOrFetchChildren(nodeId).subscribe(
        (childNodes: TodoItemNode[]) => {
          const parentNode = this.flatNodeMap.get(node);
          if (parentNode) {
            parentNode.children = childNodes;
            parentNode.expandable = childNodes.length > 0;
            console.log(childNodes.length)
            this._database.dataChange.next(this._database.data); // Trigger change detection
            this.treeControl.expand(node); // Expand the node to show the children
          }
        },
        error => {
          console.error('Error loading children:', error);
        }
      );
    }
  }
  
  constructor(private _database: ChecklistDatabase, private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren,
    );

    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
    _database.dataChange.subscribe(data => {
      this.dataSource.data = data;
      this.initializeNodeInputs(data); // Initialize input values when data changes
    });
  }

  initialize() {
    this.dataSource.data = [...this.dataSource.data];
    this._database.dataChange.next(this.dataSource.data);
    this.dataSource.data.forEach(node => {
      this.nodeInput[node.item] = ''; // Initialize input for each node
    });

  }
  
  getLevel = (node: TodoItemFlatNode) => node.level;

  isExpandable = (node: TodoItemFlatNode) => node.expandable;

  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children;

  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.item === '';

  toAdd = (node: TodoItemFlatNode) => node.isAdding = true;
  toUpdate = (node: TodoItemFlatNode) => node.isUpdating = true;
  toDelete = (node: TodoItemFlatNode) => node.isDeleting = true;

  transformer = (node: TodoItemNode, level: number) => {
  
  const existingNode = this.nestedNodeMap.get(node);
  const flatNode = existingNode && existingNode.item === node.item ? existingNode : new TodoItemFlatNode();

  flatNode.item = node.item;
  flatNode.level = level;
  flatNode.id = node.id; // Map ID to flat node
  
  flatNode.isAdding = false;
  flatNode.isUpdating = false;
  flatNode.isDeleting = false;



  // Use a default value of 0 if childrenLength is undefined
  const childrenLength = node.childrenLength ?? 0;

  // Set 'expandable' to true only if the node has children or childrenLength > 0
  flatNode.expandable = !!node.children.length || childrenLength > 0;

  this.flatNodeMap.set(flatNode, node);
  this.nestedNodeMap.set(node, flatNode);

  return flatNode;
};

expandAllNodes() {
  this.treeControl.dataNodes.forEach(node => {
    this.treeControl.expand(node);
  });
}

getDatabypage(node: TodoItemFlatNode) {
  const nodeId = node.id;
  if (!nodeId) 
    
    return;

  this.http.get<any>(`${apiUrl}/getfilter/?parentId=${nodeId}`).subscribe(
    (response: any) => {
      try {
        const nodes = response.nodes || [];
        const childNodes = this._database.mapNodes(nodes); // Map the response to TodoItemNode[]

        const parentNode = this.flatNodeMap.get(node);
        if (parentNode) {
          parentNode.children = childNodes; // Append children to the node
          parentNode.expandable = childNodes.length > 0; // Update expandable status
          
          this._database.dataChange.next(this._database.data); // Trigger change detection
          this.treeControl.expand(node); // Expand the node to show the children
        }
      } catch (error) {
        console.error('Error processing data:', error);
      }
    },
    error => {
      console.error('Error fetching data:', error);
    }
  );
}

getDatabyFilter(filterKey: string) {
  if (!filterKey) return;

  this.http.get<any>(`${apiUrl}/getfilter/?filter=${filterKey}`).subscribe(
    (response: any) => {
      try {
        const nodes = this.mapNodes(response.nodes);
        
        // Cache the filtered nodes and their ancestors
        nodes.forEach(node => {
          if (node.id) {
            this._database['filteredNodeCache'].set(node.id, node.children);
            console.log(this._database['filteredNodeCache'])
          }
        });

        this._database.dataChange.next(nodes); // Update data with filtered nodes

        this.initializeNodeInputs(nodes); // Initialize input values for each node
      } catch (error) {
        console.error('Error processing filtered data:', error);
        this.dataSource.data = [];
      }
    },
    error => {
      console.error('Error fetching filtered data:', error);
      this.dataSource.data = [];
    }
  );
}
expandAllFilteredAncestors(nodes: TodoItemNode[]) {
  const expandAncestors = (node: TodoItemNode) => {
    const flatNode = this.nestedNodeMap.get(node);
    if (flatNode) {
      this.treeControl.expand(flatNode);
    }
    node.children.forEach(expandAncestors);
  };

  nodes.forEach(expandAncestors);
}
getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
  const currentLevel = this.getLevel(node);
  if (currentLevel < 1) {
    return null;
  }

  const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

  for (let i = startIndex; i >= 0; i--) {
    const currentNode = this.treeControl.dataNodes[i];
    if (this.getLevel(currentNode) < currentLevel) {
      return currentNode;
    }
  }
  return null;
}
toggleAdd(node: TodoItemFlatNode) {
  this.toAdd(node);
}

toggleUpdate(node: TodoItemFlatNode) {
  this.toUpdate(node);
  if (node.isUpdating) {
    // Fetch valid parents when node update is initiated
    this.getValidParents(node);
  }
}

// Toggle Input Field C-U operations
initializeNodeInputs(nodes: TodoItemNode[]) {
  const traverseNodes = (node: TodoItemNode) => {
    this.nodeInput[node.item] = ''; // Initialize input for each node
    node.children.forEach(traverseNodes);
  };

  nodes.forEach(traverseNodes);
}

 // CRUD operations

  createNode(node: TodoItemFlatNode) {
    const flatNode = this.flatNodeMap.get(node);
    const parent = flatNode;
    const parentId = parent?.id;
    const newValue = this.nodeInput[node.item] || ''; // Use the input value

    const payload = {
      node: newValue,
      parent: parentId
    };

    this.http.post(`${apiUrl}/create`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(
      (response: any) => {
        // console.log('Node saved successfully:', response);
        const newNode: TodoItemNode = {
          item: newValue,
          id: response.id, // Assuming the response returns the new node ID
          children: [],
          expandable: false
        };
        this._database.dataChange.next(this._database.data);
        this._database.initialize();
        this.nodeInput[node.item] = ''; // Clear the input field after saving
      },
      error => {
        console.error('Error saving node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }

  deleteNode(nodeId: TodoItemFlatNode) {
    this.http.delete(`${apiUrl}/delete/${nodeId}`).subscribe(
      (response: any) => {
        console.log('Node deleted successfully:', response.node.item);
        // this.removeNodeFromTree(nodeId); //client side datasource
        this._database.initialize();
        this.dataSource.data = [...this.dataSource.data];
      },
      error => {
        console.error('Error deleting node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }







  getValidParents(node: TodoItemFlatNode): void {
    // URL to fetch valid parents with dynamic node ID
  
    // Fetch valid parents from the API based on node.id
    this.http.get<any>(`${apiUrl}/dropdown/?id=${node.id}`).subscribe(
      (response: any) => {
        try {
          // Assuming response contains a list of valid parent nodes
          const validNodesList = response.validParents;
          console.log('Valid Parents:', validNodesList);
          validNodesList.forEach((node: any) => {
            this.validParents.push({
              name: node.node
            });
          });
          console.log('Valid Parents:', this.validParents);
          return this.validParents; 
          // Log valid nodes for debugging

        } catch (error) {
          console.error('Error processing valid parents:', error);
        }
      },
      (error) => {
        console.error('Error fetching valid parents:', error);
      }
    );
  }
  


  editNode(node: TodoItemFlatNode) {
    const flatNode = this.flatNodeMap.get(node);
    if (!flatNode) {
      console.error('FlatNode not found');
      return;
    }

    if(!this.updatedParent) {
      console.error('Parent not found');
    }

    let updateNodeParent = this.updatedParent;
    const newValue = this.nodeInput[node.item] || '';


    const payload = {
      node: newValue || flatNode.item, // Use the input value if available, otherwise use the existing value
      parent: updateNodeParent ? updateNodeParent.id : flatNode.parent // Use the ID of the new parent if available, otherwise use the existing parent ID
    };

    this.http.patch(`${apiUrl}/update/${node.id}`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(
      (response: any) => {
        console.log('Node updated successfully:', response);
        this._database.initialize();
        this.dataSource.data = [...this.dataSource.data];
      },
      error => {
        console.error('Error updating node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }
}
